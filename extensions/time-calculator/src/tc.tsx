import { Action, ActionPanel, List } from "@raycast/api";
import { calculate } from "alfred-time-calculator";
import { useDeferredValue, useMemo, useState } from "react";

const examples = [
  "in 5 weekdays",
  "1h / 2",
  "2 weeks * 0.3 - 15s / 2",
  "at next friday",
  "30000 years ago",
  "from last sunday to next sunday",
  "in 7 hours, 2 minutes",
  "15 business days ago",
  "in 1.5 hour",
  "between yesterday and tomorrow",
  "from 100000 years ago until 9999.01.01",
];

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const deferredSearchText = useDeferredValue(searchText.trim());
  const result = useMemo(() => calculate(deferredSearchText), [deferredSearchText]);

  const randomSubtitle = useMemo(() => {
    return `Try: ${examples[Math.floor(Math.random() * examples.length)]}`;
  }, [deferredSearchText]);

  return (
    <List onSearchTextChange={setSearchText} searchBarPlaceholder="Calculate time..." throttle>
      <List.Section>
        <List.Item
          title={deferredSearchText && result.text}
          subtitle={deferredSearchText ? result.info : randomSubtitle}
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
      </List.Section>
    </List>
  );
}
