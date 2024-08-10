import { List, Cache, ActionPanel, Action, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useDeferredValue, useState } from "react";

import { Collocation, parseHtml } from "./parseHtml";
import { capitalizeWord, remapType } from "./utils";
import { CollocationList } from "./CollocationList";

const cache = new Cache();
const URL = "https://www.freecollocation.com/search";

export default function Command() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const hasCache = cache.has(deferredQuery);
  const { data, isLoading } = useFetch<string>(`${URL}?word=${deferredQuery}`, {
    execute: !!deferredQuery && !hasCache,
    onData: (data) => {
      cache.set(deferredQuery, data);
    },
  });

  const cachedData = cache.get(deferredQuery);

  const html = cachedData ? cachedData : data;
  const result = parseHtml(html ?? "");
  const hasData = !!result?.length;

  return (
    <List
      isShowingDetail={hasData}
      isLoading={isLoading}
      searchBarPlaceholder="Search for a word"
      throttle
      onSearchTextChange={setQuery}
    >
      {!hasData && !query && <List.EmptyView icon={{ source: "../assets/oxford.png" }} title="Type to begin search" />}

      {!!hasData && (
        <>
          {result.map(({ type, collocationGroup }) => (
            <List.Section key={type} title={type}>
              {collocationGroup.map((group) => (
                <ListItem key={group.id} group={group} type={type} query={deferredQuery} />
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
            target={<CollocationList collocationGroup={group} />}
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
