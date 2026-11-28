import { useEffect, useState } from "react";
import { List, Action, ActionPanel, Icon, Keyboard, Toast, showToast, Clipboard } from "@raycast/api";
import { hashText, hmacSha256, parseHashInput, detectAnyText } from "./lib/pure";
import { usePrefill } from "./lib/prefill";

/** 占位行守卫：无真实结果时不写剪贴板，Toast 提示 */
async function guardedUse(value: string) {
  if (!value) {
    await showToast(Toast.Style.Failure, "Nothing to copy");
    return false;
  }
  return true;
}

export default function Command() {
  const prefill = usePrefill(detectAnyText);
  const [query, setQuery] = useState("");

  // 预填注入：一次性写入 query state（与 timestamp/jwt 同款）；useEffect deps 不变则不复活
  useEffect(() => {
    if (prefill && !query) setQuery(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);
  const { text, key } = parseHashInput(query);
  const hasText = text.length > 0;
  const hasKey = key.length > 0;

  const rows: Array<{ id: string; subtitle: string; value: string }> = hasText
    ? [
        { id: "md5", subtitle: "MD5", value: hashText(text, "md5") },
        { id: "md5-upper", subtitle: "MD5 uppercase", value: hashText(text, "md5").toUpperCase() },
        { id: "sha1", subtitle: "SHA-1", value: hashText(text, "sha1") },
        { id: "sha1-upper", subtitle: "SHA-1 uppercase", value: hashText(text, "sha1").toUpperCase() },
        { id: "sha256", subtitle: "SHA-256", value: hashText(text, "sha256") },
        { id: "sha256-upper", subtitle: "SHA-256 uppercase", value: hashText(text, "sha256").toUpperCase() },
        { id: "hmac", subtitle: hasKey ? "HMAC-SHA256" : "HMAC-SHA256 (add ` || key` to enable)", value: hasKey ? hmacSha256(key, text) : "" },
        {
          id: "hmac-upper",
          subtitle: hasKey ? "HMAC-SHA256 uppercase" : "HMAC-SHA256 uppercase (add ` || key` to enable)",
          value: hasKey ? hmacSha256(key, text).toUpperCase() : "",
        },
      ]
    : [];

  return (
    <List
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={false}
      searchBarPlaceholder="text || key (leave key empty to skip HMAC)"
      isShowingDetail={false}
    >
      {hasText ? (
        rows.map((row) => (
          <List.Item
            key={row.id}
            id={row.id}
            icon={Icon.Hashtag}
            title={row.value || "—"}
            subtitle={row.subtitle}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy"
                  content={row.value}
                  onCopy={async () => {
                    if (!(await guardedUse(row.value))) return;
                    await showToast(Toast.Style.Success, "Copied", row.value);
                  }}
                />
                <Action
                  title="Paste to Frontmost App"
                  icon={Icon.Clipboard}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  onAction={async () => {
                    if (!(await guardedUse(row.value))) return;
                    await Clipboard.paste(row.value);
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          title="Enter text to hash"
          description='Type text in the search bar; use "text || key" for HMAC (split on first ||, no trimming)'
          icon={Icon.Hashtag}
        />
      )}
    </List>
  );
}
