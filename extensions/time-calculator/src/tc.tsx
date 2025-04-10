import { Action, ActionPanel, List } from "@raycast/api";
import { calculate, TimeCalculatorResult } from "alfred-time-calculator";
import { useDeferredValue, useState } from "react";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const deferredSearchText = useDeferredValue(searchText);

  const result = calculate(deferredSearchText);

  return (
    <List onSearchTextChange={setSearchText} searchBarPlaceholder="Search npm packages..." throttle>
      <List.Section>
        <SearchListItem key={result.text} result={result} />
      </List.Section>
    </List>
  );
}

function SearchListItem({ result }: { result: TimeCalculatorResult }) {
  return (
    <List.Item
      title={result.text}
      subtitle={result.info}
      // accessories={[{ text: searchResult.username }]}
      actions={
        result.ok && (
          <ActionPanel>
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy to Clipboard"
                content={result.text}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        )
      }
    />
  );
}
