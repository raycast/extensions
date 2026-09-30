import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { URL } from "url";
import type { DocumentationEntry } from "./types/types";

export default function UserSearchRoot() {
  const [search, setSearch] = useState<string>("");
  const { isLoading, data, error } = useFetch<DocumentationEntry[]>("https://cursor-raycast.degouville.com");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search the Cursor Documentation"
      onSearchTextChange={setSearch}
      filtering={{ keepSectionOrder: true }}
      throttle
    >
      <List.Section>
        {(data || []).map((docsItem) => (
          <List.Item
            key={docsItem.title}
            title={`${docsItem.title}`}
            icon={docsItem.icon ?? "cursor-icon.png"}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open the Cursor Documentation"
                  icon={"cursor-icon.png"}
                  url={docsItem.url || ""}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {!isLoading && !error && (
        <>
          {search.length > 0 && (
            <List.Section>
              <List.Item
                icon={"cursor-icon.png"}
                title={`Search '${search}' in the Cursor Documentation`}
                actions={
                  <ActionPanel>
                    <OpenSearchInBrowserAction search={search ?? ""} />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function OpenSearchInBrowserAction(props: { search: string }) {
  const url = new URL(`https://docs.cursor.com/search?q=${props.search}`);
  return <Action.OpenInBrowser title="Search on Cursor Documentation" icon="cursor-icon.png" url={url.href} />;
}
