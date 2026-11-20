import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { hashAndSelector } from "./lib/convert";
import { detect } from "./lib/detect";
import { DecodeHint, isDecodable } from "./decode-hint";

export default function Command() {
  const [text, setText] = useState("");
  const rows = hashAndSelector(text);
  const det = detect(text);

  return (
    <List
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder="Type a string or signature, e.g. transfer(address,uint256)"
      filtering={false}
    >
      {isDecodable(det.kind) ? <DecodeHint text={det.value} kind={det.kind} /> : null}
      {rows.length === 0 ? (
        <List.EmptyView
          icon={Icon.Hashtag}
          title="Type a string to hash"
          description="keccak256, plus the 4-byte selector and event topic for a function or event signature"
        />
      ) : (
        rows.map((r) => (
          <List.Item
            key={r.label}
            icon={Icon.Hashtag}
            title={r.value}
            subtitle={r.label}
            accessories={r.hint ? [{ text: r.hint }] : undefined}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy" content={r.value} />
                <Action.Paste title="Paste" content={r.value} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
