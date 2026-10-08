import { useState, useMemo } from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getColorHexCode } from "../func/HexCode";
import { ContestSubmissions } from "./ContestSubmissions";
import { useCodeforces } from "../func/useCodeforces";
import { CODEFORCES_BASE } from "../constants";
import { RatingChange } from "../types/codeforces";

export function Contest(value: { name: string }) {
  const userHandle = value.name;

  const { isLoading, result: items } = useCodeforces<RatingChange[]>("user.rating", { handle: userHandle });

  const [searchText, setSearchText] = useState<string>("");

  const filteredList = useMemo(() => {
    const q = (searchText ?? "").trim().toLowerCase();
    if (!q) return items ?? [];
    return (items ?? []).filter((item) => item.contestName.toLowerCase().includes(q));
  }, [items, searchText]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle={`${userHandle}'s Participated Contests`}
      searchBarPlaceholder="Search Contest By Name or Number"
      isShowingDetail
    >
      {(filteredList ?? [])
        .slice()
        .reverse()
        .map((item) => (
          <List.Item
            key={item.contestId}
            title={item.contestName}
            actions={
              <ActionPanel title="Participated Contests">
                <Action.Push
                  title="Get Submissions Details"
                  icon={Icon.List}
                  target={<ContestSubmissions id={item.contestId} handle={userHandle} name={item.contestName} />}
                />
                <Action.OpenInBrowser url={`${CODEFORCES_BASE}contest/${item.contestId}`} />
              </ActionPanel>
            }
            subtitle={`${item.contestId}`}
            detail={
              <List.Item.Detail
                markdown={`# ${item.contestName}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Rank" text={`${item.rank}`} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Old Rating">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={`${item.oldRating}`}
                        color={getColorHexCode(item.oldRating)}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.TagList title="New Rating">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={`${item.newRating}`}
                        color={getColorHexCode(item.newRating)}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.TagList title="Delta">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={`${item.newRating - item.oldRating > 0 ? "+" : "-"}${Math.abs(
                          item.newRating - item.oldRating,
                        )}`}
                        color={item.newRating - item.oldRating >= 0 ? Color.Green : Color.Red}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Time"
                      text={`${new Date((item.ratingUpdateTimeSeconds ?? 0) * 1000).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })} ${new Date((item.ratingUpdateTimeSeconds ?? 0) * 1000).toLocaleDateString([], {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}`}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
    </List>
  );
}
