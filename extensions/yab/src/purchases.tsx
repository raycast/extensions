import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { attempt, favicon } from "./components";
import { purchases } from "./parse";
import { callTool, openURL, showMail } from "./yab";

export default function Command() {
  const [kind, setKind] = useState("subscriptions");
  const [text, setText] = useState("");
  const { data, isLoading, error } = useCachedPromise(
    async (k: string, q: string) =>
      purchases(await callTool("purchases", { kind: k, ...(k === "receipts" && q.trim() ? { query: q.trim() } : {}) })),
    [kind, kind === "receipts" ? text : ""],
    { keepPreviousData: true },
  );
  return (
    <List
      isLoading={isLoading}
      throttle
      onSearchTextChange={setText}
      filtering={kind !== "receipts"}
      searchBarPlaceholder={kind === "receipts" ? "Search receipts…" : "Filter…"}
      searchBarAccessory={
        <List.Dropdown tooltip="What" storeValue onChange={setKind}>
          <List.Dropdown.Item title="Subscriptions" value="subscriptions" />
          <List.Dropdown.Item title="Orders" value="orders" />
          <List.Dropdown.Item title="Receipts" value="receipts" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Cart}
        title={error ? "Purchases come from Yab's mail" : "Nothing here"}
        description={error ? "Set up mail in Yab, Settings › Mail." : undefined}
      />
      <List.Section title={data?.summary || undefined}>
        {(data?.items ?? []).map((p, i) => (
          <List.Item
            key={`${p.title}-${p.mail ?? i}`}
            icon={p.site ? favicon(`https://${p.site}`) : Icon.Cart}
            title={p.title}
            subtitle={p.detail}
            accessories={
              /not opened|last opened (\d{2,}) days/.test(p.detail)
                ? [{ tag: { value: "Unused", color: Color.Orange } }]
                : []
            }
            actions={
              <ActionPanel>
                {p.tracking ? (
                  <Action
                    title="Track"
                    icon={Icon.Box}
                    onAction={() => attempt("Couldn't open it", () => openURL(p.tracking!))}
                  />
                ) : null}
                {p.mail ? (
                  <Action
                    title="Open the Mail"
                    icon={Icon.Envelope}
                    onAction={() => attempt("Couldn't open the mail", () => showMail(p.mail!))}
                  />
                ) : null}
                {p.site ? (
                  <Action
                    title={`Open ${p.site}`}
                    icon={Icon.Globe}
                    onAction={() => attempt("Couldn't open it", () => openURL(`https://${p.site}`))}
                  />
                ) : null}
                <Action.CopyToClipboard title="Copy" content={`${p.title}: ${p.detail}`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
