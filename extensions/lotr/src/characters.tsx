import { Character, SuccessResponse } from "./types";
import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { API_HEADERS, API_URL, CHARACTER_ICONS, DEFAULT_ICON, WIKI_ICON } from "./constants";
import { useCachedState, useFetch } from "@raycast/utils";
import ErrorComponent from "./ErrorComponent";

export default function Characters() {
  const [filter, setFilter] = useState("");
  const [races, setRaces] = useState<string[]>([]);
  const [totalCharacters, setTotalCharacters] = useCachedState("total-characters", 0);

  const { isLoading, data, error, pagination } = useFetch(
    (options) =>
      API_URL +
      "character?" +
      new URLSearchParams({ page: String(options.page + 1) }).toString() +
      (!filter ? "" : `&${filter.split("_")[0]}=${filter.split("_")[1]}`), //e.g. race_Orc -> race=Orc
    {
      headers: API_HEADERS,
      async onWillExecute() {
        await showToast({
          title: `Fetching Characters`,
          style: Toast.Style.Animated,
        });
      },
      mapResult(result: SuccessResponse<Character>) {
        setTotalCharacters(result.total);
        return {
          data: result.docs,
          hasMore: result.page < result.pages,
        };
      },
      async onData(data) {
        await showToast({
          title: `Fetched ${data.length} Characters`,
          style: Toast.Style.Success,
        });
        if (!races.length) {
          const uniqueRaces = new Set(data.map((character) => character.race));
          const uniqueRacesFiltered: string[] = [...uniqueRaces].filter(
            (race): race is string => race !== null && race !== "NaN",
          );
          setRaces(uniqueRacesFiltered);
        }
      },
    },
  );

  return error ? (
    <ErrorComponent message={error.message} />
  ) : (
    <List
      isLoading={isLoading}
      isShowingDetail
      pagination={pagination}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item title="All" value="" icon={Icon.Dot} />
          <List.Dropdown.Section title="Gender">
            <List.Dropdown.Item title="Male" value="gender_Male" icon={Icon.Male} />
            <List.Dropdown.Item title="Female" value="gender_Female" icon={Icon.Female} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Race">
            {races.map((race) => (
              <List.Dropdown.Item key={race} title={race} value={`race_${race}`} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title={`${data?.length || 0} of ${totalCharacters || data?.length} characters`}>
        {data?.map((character) => {
          const icon =
            CHARACTER_ICONS.find((c) => c.name === character.name || (c.race && character.race?.includes(c.race)))
              ?.icon || DEFAULT_ICON;

          return (
            <List.Item
              key={character._id}
              title={character.name}
              icon={icon}
              accessories={[
                {
                  icon:
                    character.gender === "Male" ? Icon.Male : character.gender === "Female" ? Icon.Female : undefined,
                },
                { tag: character.race || "N/A" },
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="_id" text={character._id} />
                      {Object.entries(character)
                        .filter(([key]) => key !== "_id" && key !== "wikiUrl")
                        .map(([key, val]) => {
                          const text = !val || val === "NaN" ? undefined : val;
                          const icon = !val || val === "NaN" ? Icon.Minus : undefined;
                          const title = key.charAt(0).toUpperCase() + key.slice(1);

                          return <List.Item.Detail.Metadata.Label key={key} title={title} text={text} icon={icon} />;
                        })}
                      {!character.wikiUrl || character.wikiUrl === "NaN" ? (
                        <List.Item.Detail.Metadata.Label title="Wiki URL" text="N/A" />
                      ) : (
                        <List.Item.Detail.Metadata.Link
                          title="Wiki URL"
                          text={character.wikiUrl}
                          target={character.wikiUrl}
                        />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  {character.wikiUrl && character.wikiUrl !== "NaN" && (
                    <Action.OpenInBrowser title="Open Wiki URL" url={character.wikiUrl} icon={WIKI_ICON} />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
