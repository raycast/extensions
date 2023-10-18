import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useState } from "react";
import { URL } from "url";
import { documentationListV3 as docsList } from "./data/docs";

export default function UserSearchRoot() {
  const [search, setSearch] = useState<string>();
  return (
    <List
      searchBarPlaceholder="Search the Astro Documentation"
      onSearchTextChange={setSearch}
      filtering={{ keepSectionOrder: true }}
      throttle
    >
      <List.Section>
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
                  icon={"astro-search-icon.png"}
                  url={docsItem.url ? docsItem.url : `http://a.stro.cc/${docsItem.title}`}
                />
                <Action onAction={openExtensionPreferences} title="Open Extension Preferences" icon={Icon.Gear} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section>
        <List.Item
          icon={"astro-search-icon.png"}
          title={`Search '${search}' in the Astro Documentation`}
          actions={
            <ActionPanel>
              <OpenSearchInBrowserAction search={search ?? ""} />
              <Action onAction={openExtensionPreferences} title="Open Extension Preferences" icon={Icon.Gear} />
            </ActionPanel>
          }
        />
        <List.Item
          key={"open Astro documentation"}
          title={"Open the Astro Documentation"}
          icon={"astro-search-icon.png"}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open the Astro Documentation" url={"http://docs.astro.build/"} />
              <Action onAction={openExtensionPreferences} title="Open Extension Preferences" icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function OpenSearchInBrowserAction(props: { search: string }) {
  const url = new URL(`https://a.stro.cc/${props.search}`);
  return <Action.OpenInBrowser title="Search on Astro Documentation" icon="astro-search-icon.png" url={url.href} />;
}
