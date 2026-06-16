import { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon, usePromise } from "@raycast/utils";
import { Bang, bangQuicklink, bangSearchUrl, getBangs } from "./kagi";

export default function Command() {
  const [filter, setFilter] = useState("");
  const { data: bangs = [], isLoading, error } = usePromise(getBangs);

  const f = filter.trim().toLowerCase();
  const matches = (
    f
      ? bangs.filter(
          (b) =>
            b.t.toLowerCase().includes(f) ||
            b.s.toLowerCase().includes(f) ||
            b.ts?.some((t) => t.toLowerCase().includes(f)),
        )
      : bangs
  ).slice(0, 60);

  function actions(b: Bang) {
    return (
      <ActionPanel>
        <Action.CreateQuicklink
          title="Create Shortcut (Alias / Hotkey)"
          icon={Icon.Link}
          quicklink={{ name: `Kagi !${b.t} — ${b.s}`, link: bangQuicklink(b.t) }}
        />
        <Action.OpenInBrowser title={`Open !${b.t} in Kagi`} icon={Icon.Globe} url={bangSearchUrl(b.t, "")} />
        <Action.CopyToClipboard
          title="Copy Shortcut URL"
          icon={Icon.Clipboard}
          content={bangQuicklink(b.t)}
        />
      </ActionPanel>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setFilter}
      searchBarPlaceholder="Find a !bang to turn into a shortcut…"
      filtering={false}
      throttle
    >
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="Couldn't load bangs" description={error.message} />
      ) : (
        <>
          {f && (
            <List.Item
              icon={Icon.Stars}
              title={`Custom bang: !${f}`}
              subtitle="create a shortcut for this trigger"
              actions={actions({ t: f, s: "Custom" })}
            />
          )}
          <List.Section
            title="Bangs"
            subtitle={bangs.length ? `${matches.length} of ${bangs.length}` : undefined}
          >
            {matches.map((b) => (
              <List.Item
                key={`${b.t}-${b.s}`}
                icon={b.d ? getFavicon(`https://${b.d}`, { fallback: Icon.Globe }) : Icon.Globe}
                title={b.s}
                subtitle={`!${b.t}`}
                accessories={b.c ? [{ tag: b.c }] : undefined}
                actions={actions(b)}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
