import { ActionPanel, CopyToClipboardAction, PasteAction, getPreferenceValues, List } from "@raycast/api";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

interface Preferences {
  primaryAction: string;
}

export default function Command() {
  const prefs: Preferences = getPreferenceValues();
  const execPath = `.${__dirname}/assets/sfsymbols`;
  
  fs.chmodSync(execPath, "755");
  
  const symbols: { name: string, symbol: string, categories: string[] }[] = JSON.parse(execFileSync(execPath).toString());

  return (
    <List isLoading={false} searchBarPlaceholder="Filter SF Symbols...">
      {symbols.map((symbol) => (
        <List.Item
          key={symbol.symbol}
          title={symbol.symbol}
          subtitle={symbol.name}
          accessoryTitle={symbol.categories.join(", ")}
          keywords={symbol.categories.concat([symbol.name])} // Add symbol name to categories so it can be searched, since the title is only the symbol
          actions={
            <ActionPanel>
              {
                prefs.primaryAction == "paste"
                  ? <PasteAction title="Paste Symbol" content={symbol.symbol} />
                  : <CopyToClipboardAction title="Copy Symbol" content={symbol.symbol} />
              }
              {
                prefs.primaryAction == "paste"
                  ? <CopyToClipboardAction title="Copy Symbol" content={symbol.symbol} />
                  : <PasteAction title="Paste Symbol" content={symbol.symbol} />
              }
              <CopyToClipboardAction title="Copy Name" content={symbol.name} shortcut={{ modifiers: ["opt"], key: "c" }} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}