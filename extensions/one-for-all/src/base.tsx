import { ActionPanel, Action, List } from "@raycast/api";
import { useState } from "react";
import { detectAndConvert, ConversionResult } from "./utils/converter";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  let input = searchText;
  let iterations = 1;

  const pipeIndex = searchText.lastIndexOf("|");
  if (pipeIndex !== -1) {
    const potentialCount = searchText.slice(pipeIndex + 1).trim();
    if (/^\d+$/.test(potentialCount)) {
      iterations = parseInt(potentialCount, 10);
      input = searchText.slice(0, pipeIndex).trim();
    }
  }

  const results: ConversionResult[] = detectAndConvert(input, iterations);

  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter a number (decimal, hex, binary) or text..."
      throttle
    >
      {results.length === 0 ? (
        <List.EmptyView title="Type something to convert" description="Use 'text | N' to convert N times recursively" />
      ) : (
        results.map((item, index) => (
          <List.Item
            key={index}
            title={item.value}
            subtitle={item.label}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={item.value} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
