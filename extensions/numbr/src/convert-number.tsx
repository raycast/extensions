import { Action, ActionPanel, Clipboard, Icon, List, showToast, Toast } from "@raycast/api";
import { useMemo, useState } from "react";
import { buildResults } from "./lib/results";
import type { NumbrResult } from "./lib/types";

const EXAMPLES = [
  "1M",
  "2.5B",
  "1 billion",
  "1 trillion",
  "1 quadrillion",
  "10 crore",
  "45 lakh",
  "1MB",
  "1MiB",
  "1GiB",
];

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const results = useMemo(() => buildResults(searchText), [searchText]);
  const query = searchText.trim();

  return (
    <List
      searchBarPlaceholder="Try 1M, 1B, 1 trillion, 10 crore, 1MB, 1MiB..."
      onSearchTextChange={setSearchText}
      throttle
      filtering={false}
    >
      {query.length === 0 ? (
        <List.Section title="Examples">
          {EXAMPLES.map((example) => (
            <List.Item
              key={example}
              icon={Icon.MagnifyingGlass}
              title={example}
              subtitle="Example input"
              actions={
                <ActionPanel>
                  <Action
                    title="Copy Example"
                    icon={Icon.Clipboard}
                    onAction={async () => {
                      await Clipboard.copy(example);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Copied",
                        message: example,
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <>
          {results.length > 0 ? (
            <List.Section title="Results">
              {results.map((result) => (
                <ResultItem key={`${result.group}-${result.title}-${result.value}`} result={result} />
              ))}
            </List.Section>
          ) : (
            <List.EmptyView
              icon={Icon.ExclamationMark}
              title="Could not understand this number"
              description="Try 1M, 1B, 1 trillion, 10 crore, 1MB, or 1MiB."
            />
          )}
        </>
      )}
    </List>
  );
}

function ResultItem({ result }: Readonly<{ result: NumbrResult }>) {
  return (
    <List.Item
      icon={result.icon}
      title={result.title}
      subtitle={result.value}
      accessories={result.accessories}
      actions={<CopyActions value={result.copyValue ?? result.value} label={result.title} markdown={result.markdown} />}
    />
  );
}

function CopyActions({ value, label, markdown }: Readonly<{ value: string; label: string; markdown?: string }>) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Value" content={value} />
      <Action.CopyToClipboard title="Copy Label and Value" content={`${label}: ${value}`} />
      {markdown ? <Action.CopyToClipboard title="Copy All Results" content={markdown} /> : null}
    </ActionPanel>
  );
}
