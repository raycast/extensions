import { Action, ActionPanel, Icon, Keyboard, LaunchProps, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { caliberMarkdown, searchCalibers } from "./lib/calibers.ts";

export default function Command(props: LaunchProps) {
  const [query, setQuery] = useState(props.fallbackText ?? "");
  const results = useMemo(() => searchCalibers(query), [query]);

  return (
    <List
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search calibers, e.g. 9mm Luger, 300 BLK or 12 GA"
      isShowingDetail={results.length > 0}
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No Caliber Found"
        description="Try a number with its name, like 6.5 CM or 45 ACP."
      />
      {results.map((c) => (
        <List.Item
          key={c.id}
          title={c.name}
          subtitle={c.typeLabel}
          detail={<List.Item.Detail markdown={caliberMarkdown(c)} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Caliber Name" content={c.name} />
              <Action.Paste title="Paste Caliber Name" content={c.name} />
              {c.url ? (
                <Action.OpenInBrowser
                  title="Open Price Comparison"
                  icon={Icon.Globe}
                  url={c.url}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
              ) : null}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
