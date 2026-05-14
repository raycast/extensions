import { ActionPanel, Action, List, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState, useMemo } from "react";
import { HowLongToBeatService, HowLongToBeatEntry } from "howlongtobeat";
import { Details } from "./details";
import { pluralize } from "./helpers";
import { HltbSearch } from "./hltbsearch";
import { useCachedPromise } from "@raycast/utils";
import { useGameDetailFetch } from "./useGameDetailFetch";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { data: results, isLoading } = useSearch(searchText);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search games..."
      throttle
      isShowingDetail={isShowingDetail && (results?.length ?? 0) > 0}
    >
      <List.Section title="Results" subtitle={results ? results.length + "" : "0"}>
        {results?.map((searchResult) => (
          <SearchListItem
            key={searchResult.id}
            searchResult={searchResult}
            isShowingDetail={isShowingDetail}
            onToggleDetail={() => setIsShowingDetail(!isShowingDetail)}
          />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({
  searchResult,
  isShowingDetail,
  onToggleDetail,
}: {
  searchResult: HowLongToBeatEntry;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
}) {
  const url = `${HltbSearch.DETAIL_URL}${searchResult.id}`;
  const { push } = useNavigation();
  const { data: result, isLoading, markdown } = useGameDetailFetch(searchResult.id, isShowingDetail);

  const mainStoryHours = searchResult.gameplayMain || 0;
  const mainStoryText = mainStoryHours >= 1 ? `${searchResult.gameplayMain} ${pluralize(mainStoryHours, "hour")}` : "-";

  const mainExtraHours = result?.gameplayMainExtra || 0;
  const mainExtraText = mainExtraHours >= 1 ? `${result?.gameplayMainExtra} ${pluralize(mainExtraHours, "hour")}` : "-";

  const completionistsHours = result?.gameplayCompletionist || 0;
  const completionistsText =
    completionistsHours >= 1 ? `${result?.gameplayCompletionist} ${pluralize(completionistsHours, "hour")}` : "-";

  return (
    <List.Item
      title={searchResult.name}
      subtitle={!isShowingDetail ? `Main Story: ${mainStoryText}` : undefined}
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          markdown={markdown}
          metadata={
            result && (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Main Story" text={mainStoryText} />
                <List.Item.Detail.Metadata.Label title="Main + Extras" text={mainExtraText} />
                <List.Item.Detail.Metadata.Label title="Completionists" text={completionistsText} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.TagList title="Platforms">
                  {result.playableOn.map((platform) => (
                    <List.Item.Detail.Metadata.TagList.Item key={platform} text={platform} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              </List.Item.Detail.Metadata>
            )
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Show Details"
              icon={Icon.Sidebar}
              onAction={() => push(<Details id={searchResult.id} name={searchResult.name} />)}
            />
            <Action
              title="Toggle Details"
              icon={Icon.AppWindowSidebarLeft}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={onToggleDetail}
            />
            <Action.OpenInBrowser title="Open in Browser" url={url} />
            <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "." }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch(searchText: string) {
  const hltb = useMemo(() => new HltbSearch(), []);

  return useCachedPromise(
    async (text: string) => {
      try {
        const searchTerms = text.split(" ");
        const searchResult = await hltb.search(searchTerms);

        const hltbEntries = new Array<HowLongToBeatEntry>();

        for (const resultEntry of searchResult.data) {
          hltbEntries.push(
            new HowLongToBeatEntry(
              "" + resultEntry.game_id,
              resultEntry.game_name,
              "",
              resultEntry.profile_platform ? resultEntry.profile_platform.split(", ") : [],
              HltbSearch.IMAGE_URL + resultEntry.game_image,
              [
                ["Main", "Main"],
                ["Main + Extra", "Main + Extra"],
                ["Completionist", "Completionist"],
              ],
              Math.round(resultEntry.comp_main / 3600),
              Math.round(resultEntry.comp_plus / 3600),
              Math.round(resultEntry.comp_100 / 3600),
              HowLongToBeatService.calcDistancePercentage(resultEntry.game_name, text),
              text,
            ),
          );
        }

        return hltbEntries;
      } catch (error) {
        console.error("search error", error);
        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
        throw error;
      }
    },
    [searchText],
  );
}
