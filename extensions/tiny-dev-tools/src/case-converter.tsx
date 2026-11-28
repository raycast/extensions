import { useEffect, useState } from "react";
import { List, Action, ActionPanel, Icon, Keyboard, Toast, showToast, Clipboard } from "@raycast/api";
import { convertCase, detectCaseLike, type CaseResult } from "./lib/pure";
import { usePrefill } from "./lib/prefill";

const FORMAT_ROWS: Array<{ key: keyof CaseResult; label: string }> = [
  { key: "camel", label: "camelCase" },
  { key: "pascal", label: "PascalCase" },
  { key: "snake", label: "snake_case" },
  { key: "kebab", label: "kebab-case" },
  { key: "constant", label: "CONSTANT_CASE" },
  { key: "dot", label: "dot.case" },
];

export default function Command() {
  const prefill = usePrefill(detectCaseLike);
  const [query, setQuery] = useState("");

  // 预填注入：一次性写入 query state（与 timestamp/hash/jwt 同款）
  useEffect(() => {
    if (prefill && !query) setQuery(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const result = convertCase(query.trim());

  return (
    <List
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={false}
      searchBarPlaceholder="Type an identifier (any casing); 6 naming styles side by side"
      isShowingDetail={false}
    >
      {query.trim() ? (
        FORMAT_ROWS.map((row) => (
          <List.Item
            key={row.key}
            id={row.key}
            icon={Icon.Text}
            title={result[row.key]}
            subtitle={row.label}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy"
                  content={result[row.key]}
                  onCopy={async () => {
                    await showToast(Toast.Style.Success, "Copied", `${row.label}: ${result[row.key]}`);
                  }}
                />
                <Action
                  title="Paste to Frontmost App"
                  icon={Icon.Clipboard}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  onAction={async () => {
                    await Clipboard.paste(result[row.key]);
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          title="Type or paste an identifier"
          description="Any casing input (camelCase / snake_case / kebab-case…); 6 styles listed, Enter to copy"
          icon={Icon.Text}
        />
      )}
    </List>
  );
}
