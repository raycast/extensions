import { Action, ActionPanel, Clipboard, closeMainWindow, List, showHUD } from "@raycast/api";
import { useMemo, useState } from "react";
import { compliments } from "./data/compliments.schema";
import { TONES, type Tone } from "./types";

const ALL_TONES = "all" as const;
type ToneFilter = Tone | typeof ALL_TONES;

function toneLabel(t: Tone): string {
  return t
    .split("-")
    .map((part) => (part.length === 0 ? part : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}

function poolFor(filter: ToneFilter): readonly (typeof compliments)[number][] {
  return filter === ALL_TONES ? compliments : compliments.filter((c) => c.tone === filter);
}

function pickRandomId(pool: readonly (typeof compliments)[number][], exclude?: string): string | undefined {
  if (pool.length === 0) return undefined;
  const candidates = pool.length >= 2 && exclude ? pool.filter((c) => c.id !== exclude) : pool;
  return candidates[Math.floor(Math.random() * candidates.length)].id;
}

async function copyText(text: string) {
  await Clipboard.copy(text);
  await showHUD(`Copied: ${text}`);
  await closeMainWindow();
}

export default function Command() {
  const [toneFilter, setToneFilter] = useState<ToneFilter>(ALL_TONES);
  const [selectedId, setSelectedId] = useState<string | undefined>(() => pickRandomId(poolFor(ALL_TONES)));

  const pool = useMemo(() => poolFor(toneFilter), [toneFilter]);

  const effectiveSelectedId = useMemo(
    () => (selectedId && pool.find((c) => c.id === selectedId) ? selectedId : pickRandomId(pool)),
    [selectedId, pool],
  );

  const pickRandom = () => {
    const next = pickRandomId(pool, selectedId);
    setSelectedId(next);
  };

  return (
    <List
      isShowingDetail
      selectedItemId={effectiveSelectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by tone" storeValue onChange={(v) => setToneFilter(v as ToneFilter)}>
          <List.Dropdown.Item title="All tones" value="all" />
          {TONES.map((t) => (
            <List.Dropdown.Item key={t} title={toneLabel(t)} value={t} />
          ))}
        </List.Dropdown>
      }
    >
      {pool.map((c) => (
        <List.Item
          key={c.id}
          id={c.id}
          title={c.text}
          detail={<List.Item.Detail markdown={`# ${c.text}\n\n—\n*${c.tone}*`} />}
          actions={
            <ActionPanel>
              <Action title="Copy Compliment" onAction={() => copyText(c.text)} />
              <Action title="Shuffle" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={pickRandom} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
