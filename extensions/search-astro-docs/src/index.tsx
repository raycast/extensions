import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useState } from "react";
import { URL } from "url";
import { documentationListV3 as docsList } from "./data/docs";

export default function UserSearchRoot() {
  const [search, setSearch] = useState<string>();
  return (
    <List searchBarPlaceholder="Search the Astro Documentation" onSearchTextChange={setSearch} filtering={true}>
      <List.EmptyView
        title="No Results"
        description={`Search '${search}' in the Astro Documentation`}
        actions={
          <ActionPanel>
            <OpenSearchInBrowserAction search={search ?? ""} />
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
      <List.Item
        key={"preferences"}
        keywords={["settings", "language"]}
        icon={Icon.Gear}
        title={"Open extension preferences"}
        actions={
          <ActionPanel>
            <Action
              title="Open Extension Preferences"
              onAction={openExtensionPreferences}
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

function OpenSearchInBrowserAction(props: { search: string }) {
  const url = new URL(`https://a.stro.cc/${props.search}`);
  return <Action.OpenInBrowser title="Search on Astro Documentation" icon="astro-search-icon.png" url={url.href} />;
}
