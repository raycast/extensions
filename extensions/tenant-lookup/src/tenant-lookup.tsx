import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { loadTenants } from "./loader";
import type { Preferences } from "./types";

// ⌘C / Ctrl+C copies the name; ⌘⇧C / Ctrl+Shift+C copies the UUID.
const COPY_NAME_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "c" },
  Windows: { modifiers: ["ctrl"], key: "c" },
};
const COPY_UUID_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "c" },
  Windows: { modifiers: ["ctrl", "shift"], key: "c" },
};

const OPEN_DOCS_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "d" },
  Windows: { modifiers: ["ctrl"], key: "d" },
};

// The extension's README on GitHub (canonical location once merged to main).
const README_URL = "https://github.com/OrionSecurity/extensions/blob/main/tenant-lookup/README.md";

// Decide whether the search text is a UUID search (Return copies the name) or a
// name search (Return copies the UUID — the default).
//
// Rule: if the query contains ANY character that is not a hex digit or a dash —
// e.g. a single non-hex letter (g–z), a space, or punctuation — it's a name
// search, so Return keeps copying the UUID. Only an all-hex query (a UUID or a
// UUID fragment, 4+ chars) flips Return to copy the name.
const NON_HEX_CHAR = /[^0-9a-f-]/i;
function isUuidSearch(query: string): boolean {
  const q = query.trim();
  return q.length >= 4 && !NON_HEX_CHAR.test(q);
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");

  const { data, isLoading, error, revalidate } = useCachedPromise(
    (source, localPath, bucket, key, region, profile) =>
      loadTenants({ source, localPath, bucket, key, region, profile } as Preferences),
    [prefs.source, prefs.localPath, prefs.bucket, prefs.key, prefs.region, prefs.profile],
    {
      keepPreviousData: true,
      onError: (e) => {
        showFailureToast(e, { title: "Couldn't load tenants" });
      },
    },
  );

  const tenants = data ?? [];
  const showError = !isLoading && tenants.length === 0 && !!error;

  // A failed reload with keepPreviousData leaves the previous list on screen.
  // Flag it loudly so nobody copies outdated UUIDs thinking they're current.
  const isStale = !isLoading && !!error && tenants.length > 0;
  const staleAccessory = isStale
    ? [{ icon: { source: Icon.Warning, tintColor: Color.Red }, tooltip: "Cached data — last reload failed" }]
    : undefined;

  // When the user is searching by UUID, Return copies the name; otherwise it copies the UUID.
  // The primary (first) action is the one bound to Return, so we order accordingly.
  const isUuidQuery = isUuidSearch(searchText);

  return (
    <List
      isLoading={isLoading}
      filtering
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by tenant name or UUID…"
      navigationTitle={isStale ? "Tenant Lookup — reload failed, showing cached data" : undefined}
    >
      {showError ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't load tenants"
          description={error?.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.OpenInBrowser
                title="Open Documentation"
                url={README_URL}
                icon={Icon.Book}
                shortcut={OPEN_DOCS_SHORTCUT}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title={isStale ? "⚠︎ Reload failed — cached data (may be outdated)" : undefined}
          subtitle={isStale ? error?.message : undefined}
        >
          {tenants.map((t) => {
            const copyUuid = (
              <Action.CopyToClipboard key="uuid" title="Copy UUID" content={t.uuid} shortcut={COPY_UUID_SHORTCUT} />
            );
            const copyName = (
              <Action.CopyToClipboard key="name" title="Copy Name" content={t.name} shortcut={COPY_NAME_SHORTCUT} />
            );
            return (
              <List.Item
                key={t.uuid}
                title={t.name}
                subtitle={t.uuid}
                keywords={[t.uuid, t.name]}
                accessories={staleAccessory}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      {isUuidQuery ? [copyName, copyUuid] : [copyUuid, copyName]}
                      <Action.Paste title="Paste UUID" content={t.uuid} />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Reload"
                        icon={Icon.ArrowClockwise}
                        onAction={revalidate}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                      />
                      <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                      <Action.OpenInBrowser
                        title="Open Documentation"
                        url={README_URL}
                        icon={Icon.Book}
                        shortcut={OPEN_DOCS_SHORTCUT}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
