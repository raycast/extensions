import { ActionPanel, CopyToClipboardAction, List, PasteAction, environment, getPreferenceValues } from "@raycast/api";
import fs from "node:fs";

interface Preferences {
  primaryAction: string;
}

export default function Command() {
  const prefs: Preferences = getPreferenceValues();
  const symbols: { name: string; symbol: string; categories: string[] }[] = JSON.parse(
    fs.readFileSync(`${environment.assetsPath}/symbols.json`, { encoding: "utf8" })
  );

  return (
    <List isLoading={false} searchBarPlaceholder="Filter SF Symbols...">
      {symbols.map((symbol) => (
        <List.Item
          key={symbol.symbol}
          title={symbol.symbol}
          subtitle={symbol.name}
          accessoryTitle={symbol.categories.join(", ")}
          keywords={symbol.categories.concat([symbol.name])} // Add symbol name to categories so it can be searched, since the title is only the symbol
          actions={getActions(prefs, symbol.symbol, symbol.name)}
        />
      ))}
    </List>
  );
}

function getActions(prefs: Preferences, symbol: string, name: string) {
  if (prefs.primaryAction == "paste") {
    return (
      <ActionPanel>
        <PasteAction title="Paste Symbol" content={symbol} />
        <CopyToClipboardAction title="Copy Symbol" content={symbol} />
        <CopyToClipboardAction title="Copy Name" content={name} shortcut={{ modifiers: ["opt"], key: "c" }} />
      </ActionPanel>
    );
  } else if (prefs.primaryAction == "copy") {
    return (
      <ActionPanel>
        <CopyToClipboardAction title="Copy Symbol" content={symbol} />
        <CopyToClipboardAction title="Copy Name" content={name} shortcut={{ modifiers: ["opt"], key: "c" }} />
        <PasteAction title="Paste Symbol" content={symbol} />
      </ActionPanel>
    );
  } else if (prefs.primaryAction == "copyName") {
    return (
      <ActionPanel>
        <CopyToClipboardAction title="Copy Name" content={name} shortcut={{ modifiers: ["opt"], key: "c" }} />
        <CopyToClipboardAction title="Copy Symbol" content={symbol} />
        <PasteAction title="Paste Symbol" content={symbol} />
      </ActionPanel>
    );
  }
}
