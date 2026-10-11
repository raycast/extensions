import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { findStructures, openWithToast, type StructureFile } from "./shared";

export default function SearchStructures() {
  const [items, setItems] = useState<StructureFile[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { findStructures().then(setItems).finally(() => setLoading(false)); }, []);
  return <List isLoading={loading} searchBarPlaceholder="Search PDB, SDF, CIF, MOL…">
    {items.map((item) => <List.Item key={item.path} id={item.path} title={item.name} subtitle={item.path} icon={Icon.Document} actions={<ActionPanel><Action title="Open in Burette" icon={Icon.Eye} onAction={() => openWithToast(item.path)} /><Action.CopyToClipboard title="Copy Path" content={item.path} /></ActionPanel>} />)}
  </List>;
}
