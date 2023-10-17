import { Action, ActionPanel, List, openExtensionPreferences } from "@raycast/api";
import { ReactElement, useState } from "react";
import { URL } from "url";
import { documentationListV3 as docsList } from "./data/docs";
import { searchIncludes } from "./utils";

export default function UserSearchRoot(): ReactElement {
  const [search, setSearch] = useState<string>();
  return (
    <List searchText={search} onSearchTextChange={setSearch} searchBarPlaceholder="Search the Astro Documentation">
      <ListItemSearch search={search} />
    </List>
  );
}

function ListItemSearch(props: { search: string | undefined }): ReactElement | null {
  const s = props.search;
  return (
    <>
      {(!s || s.length <= 0) && (
        <>
          <List.Item
            title={`Open the Astro Documentation`}
            icon="astro-search-icon.png"
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open the Astro Documentation"
                  icon="astro-search-icon.png"
                  url="https://docs.astro.build/"
                />
              </ActionPanel>
            }
          />
          {docsList.map((docsItem) => (
            <List.Item
              keywords={docsItem.keywords}
              key={docsItem.title}
              title={`${docsItem.title}`}
              icon={docsItem.icon ?? "astro-search-icon.png"}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open the Astro Documentation"
                    url={docsItem.url ? docsItem.url : `http://a.stro.cc/${docsItem.title}`}
                  />
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
      {s && s.length > 0 && (
        <>
          {docsList.map(
            (docsItem) =>
              searchIncludes(docsItem, s) && (
                <List.Item
                  keywords={docsItem.keywords}
                  key={docsItem.title}
                  title={`${docsItem.title}`}
                  icon={docsItem.icon ?? "astro-search-icon.png"}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        title="Open the Astro Documentation"
                        url={docsItem.url ? docsItem.url : `http://a.stro.cc/${docsItem.title}`}
                      />
                    </ActionPanel>
                  }
                />
              )
          )}
          <List.Item
            title={`Search '${s}' in the Astro Documentation`}
            icon="astro-search-icon.png"
            actions={
              <ActionPanel>
                <OpenSearchInBrowserAction search={s} />
              </ActionPanel>
            }
          />
        </>
      )}
      <List.Item
        title={`Open Extension Preferences`}
        key={"preferences"}
        keywords={["preferences", "settings"]}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </>
  );
}

function OpenSearchInBrowserAction(props: { search: string }): ReactElement {
  const url = new URL(`https://a.stro.cc/${props.search}`);
  return <Action.OpenInBrowser title="Search on Astro Documentation" icon="astro-search-icon.png" url={url.href} />;
}
