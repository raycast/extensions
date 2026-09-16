import { Action, ActionPanel, Clipboard, Icon, List, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { AssetRow, framemind, rows } from "./framemind";

export default function Search() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!query.trim()) {
      setItems([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        setItems(rows(await framemind(["search", query, "--limit", "50"])));
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);
  return (
    <List
      isLoading={loading}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Search screenshots…"
    >
      {items.map((item) => (
        <List.Item
          key={item.assetID}
          icon={Icon.Image}
          title={item.filename}
          subtitle={
            item.score == null ? undefined : `${Math.round(item.score * 100)}%`
          }
          actions={<AssetActions item={item} />}
        />
      ))}
    </List>
  );
}

export function AssetActions({ item }: { item: AssetRow }) {
  return (
    <ActionPanel>
      <Action
        title="Open in FrameMind"
        onAction={() =>
          open(`framemind://open?asset=${encodeURIComponent(item.assetID)}`)
        }
      />
      <Action.CopyToClipboard title="Copy Asset ID" content={item.assetID} />
      <Action
        title="Copy OCR"
        onAction={async () => {
          const result = await framemind(["ocr", item.assetID]);
          await Clipboard.copy(String(result.data?.text ?? ""));
        }}
      />
    </ActionPanel>
  );
}
