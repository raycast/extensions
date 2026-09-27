import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { findStructures, openWithToast, type StructureFile } from "./shared";

export default function RecentStructures() {
  const [items, setItems] = useState<StructureFile[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { findStructures().then(setItems).finally(() => setLoading(false)); }, []);
  return <List isLoading={loading} searchBarPlaceholder="Filter recent structures…">
    {items.slice(0, 50).map((item) => <List.Item key={item.path} title={item.name} subtitle={new Date(item.modifiedAt).toLocaleString()} accessories={[{ text: `${Math.max(1, Math.round(item.size / 1024))} KB` }]} icon={Icon.Clock} actions={<ActionPanel><Action title="Open in Burette" icon={Icon.Eye} onAction={() => openWithToast(item.path)} /><Action.CopyToClipboard title="Copy Path" content={item.path} /></ActionPanel>} />)}
  </List>;
}
