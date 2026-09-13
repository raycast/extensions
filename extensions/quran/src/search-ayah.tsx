import { Action, ActionPanel, List } from "@raycast/api";
import { useState } from "react";
import { formatAyah } from "./lib/format";
import { searchAyahs } from "./lib/search";
import type { IndexedAyah } from "./lib/types";

function AyahActions({ ayah }: { ayah: IndexedAyah }) {
  const content = formatAyah(ayah);
  return (
    <ActionPanel>
      <Action.Paste title="Paste Ayah" content={content} />
      <Action.CopyToClipboard
        title="Copy to Clipboard"
        content={content}
        shortcut={{ macOS: { modifiers: ["cmd"], key: "return" }, Windows: { modifiers: ["ctrl"], key: "return" } }}
      />
    </ActionPanel>
  );
}

export default function Command() {
  const [query, setQuery] = useState("");
  const results = searchAyahs(query);

  return (
    <List
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search by text, ayah number, or 2:255 for Surah:Ayah"
      throttle
    >
      {results.map((ayah) => (
        <List.Item
          key={`${ayah.surah_id}:${ayah.ayah_id}`}
          title={ayah.text}
          subtitle={`${ayah.surah_name} (${ayah.surah_name_en})`}
          accessories={[{ text: `${ayah.surah_id}:${ayah.ayah_id}` }, { text: `Page ${ayah.page}` }]}
          actions={<AyahActions ayah={ayah} />}
        />
      ))}
      <List.EmptyView title={query ? "No ayahs found" : "Type to search all ayahs"} />
    </List>
  );
}
