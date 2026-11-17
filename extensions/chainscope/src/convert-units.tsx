import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { convertUnits } from "./lib/convert";
import { detect } from "./lib/detect";
import { DecodeHint, isDecodable } from "./decode-hint";

export default function Command() {
  const [text, setText] = useState("");
  const rows = convertUnits(text);
  const det = detect(text);

  return (
    <List
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder="Enter a wei / gwei / ether amount, a hex value, or a number"
      filtering={false}
    >
      {isDecodable(det.kind) ? <DecodeHint text={det.value} kind={det.kind} /> : null}
      {rows.length === 0 ? (
        <List.EmptyView
          icon={Icon.Calculator}
          title="Convert EVM units"
          description="wei · gwei · ether · hex ↔ decimal · bytes32 padding"
        />
      ) : (
        rows.map((r) => (
          <List.Item
            key={r.label}
            icon={Icon.Calculator}
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
