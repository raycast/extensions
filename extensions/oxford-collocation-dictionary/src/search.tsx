import { List, ActionPanel, Action, Icon, LaunchProps } from "@raycast/api";
import { useState } from "react";

import { Collocation } from "./lib/cheerio";
import { capitalizeWord, remapType } from "./lib/utils";
import { useCollocations } from "./hooks/useCollocations";
import { CollocationList } from "./components/CollocationList";

export default function Command(props: LaunchProps) {
  const [query, setQuery] = useState(props.launchContext?.selectedText ?? "");
  const { collocations, isLoading } = useCollocations(query);

  const hasData = collocations.length > 0;

  return (
    <List
      isShowingDetail={hasData}
      isLoading={isLoading}
      searchBarPlaceholder="Search for a word"
      throttle
      searchText={query}
      onSearchTextChange={setQuery}
    >
      {!hasData && <List.EmptyView icon={{ source: "../assets/logo.png" }} title="Type to begin search" />}

      {!!hasData && (
        <>
          {collocations.map(({ type, collocationGroup }) => (
            <List.Section key={type} title={type}>
              {collocationGroup.map((group) => (
                <ListItem key={group.id} group={group} type={type} query={query} />
              ))}
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}

function ListItem({ group, type, query }: { group: Collocation; type: string; query: string }) {
  return (
    <List.Item
      title={remapType(group.type)}
      accessories={[{ tag: group.collocations.length.toString() }]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Collocations as List"
            icon={Icon.List}
            target={<CollocationList collocations={group.collocations} />}
          />
          <Action.OpenInBrowser url={`${URL}?word=${query}`} />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Type" text={capitalizeWord(type)} />
              {group.definition && <List.Item.Detail.Metadata.Label title="Definition" text={group.definition} />}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Collocations">
                {group.collocations.map((collocation, index) => (
                  // We can use index as key here i think, the order of the data will never change
                  <List.Item.Detail.Metadata.TagList.Item key={index} text={collocation} />
                ))}
              </List.Item.Detail.Metadata.TagList>
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
