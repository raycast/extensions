import { Action, ActionPanel, Icon, List, openExtensionPreferences, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { URL } from "url";
import { DocumentationEntry } from "./types/types";

export default function UserSearchRoot() {
  const { language } = getPreferenceValues<Preferences.Index>();
  const [search, setSearch] = useState<string>("");
  const { isLoading, data, revalidate, error } = useFetch<DocumentationEntry[]>(
    `https://raycast.elian.codes/api/${language}`
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search the Astro Documentation"
      onSearchTextChange={setSearch}
      filtering={{ keepSectionOrder: true }}
      throttle
    >
      <List.Section>
        {(data || []).map((docsItem) => (
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
                <Action onAction={revalidate} title="Reload Items" icon={Icon.Download} />
                <Action onAction={openExtensionPreferences} title="Open Extension Preferences" icon={Icon.Gear} />
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
                icon={"astro-search-icon.png"}
                title={`Search '${search}' in the Astro Documentation`}
                actions={
                  <ActionPanel>
                    <OpenSearchInBrowserAction search={search ?? ""} />
                    <Action onAction={revalidate} title="Reload Items" icon={Icon.Download} />
                    <Action onAction={openExtensionPreferences} title="Open Extension Preferences" icon={Icon.Gear} />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
          <List.Section>
            <List.Item
              key={"open Astro documentation"}
              title={"Open the Astro Documentation"}
              icon={"astro-search-icon.png"}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open the Astro Documentation" url={"http://docs.astro.build/"} />
                  <Action onAction={revalidate} title="Reload Items" icon={Icon.Download} />
                  <Action onAction={openExtensionPreferences} title="Open Extension Preferences" icon={Icon.Gear} />
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      )}
    </List>
  );
}

function OpenSearchInBrowserAction(props: { search: string }) {
  const url = new URL(`https://a.stro.cc/${props.search}`);
  return <Action.OpenInBrowser title="Search on Astro Documentation" icon="astro-search-icon.png" url={url.href} />;
}
