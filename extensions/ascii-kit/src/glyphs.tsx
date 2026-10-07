import { Action, ActionPanel, List, Keyboard } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { GROUPS, Glyph } from "./data/glyphs";
import { fence } from "./lib/markdown";
import { displayWidth, riskyGlyphs, splitLines } from "./lib/width";

const codePoints = (text: string) => {
  const chars = [...new Set([...text.replace(/\s/g, "")])];
  const shown = chars.slice(0, 6).map((c) => "U+" + c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0"));
  return shown.join(" ") + (chars.length > 6 ? " …" : "");
};

const idOf = (groupTitle: string, g: Glyph) => `${groupTitle}:${g.name}`;
const isMultiLine = (g: Glyph) => g.text.includes("\n");

/** Advances a frame counter while the selected item is a spinner; one interval at most. */
function useFrame(selected: Glyph | undefined) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    setFrame(0);
    if (!selected?.frames) return;
    const timer = setInterval(() => setFrame((f) => f + 1), selected.interval ?? 100);
    return () => clearInterval(timer);
  }, [selected]);
  return frame;
}

function detailMarkdown(g: Glyph, hint: string, frame: number): string {
  const body = g.frames ? `${g.frames[frame % g.frames.length]}  Loading…` : g.text.trimEnd();
  const rows = splitLines(g.text).length;
  const facts = [
    g.frames ? `${g.frames.length} frames · ${g.interval} ms` : rows > 1 ? `${rows} rows` : null,
    `${Math.max(...splitLines(g.text).map(displayWidth))} columns`,
    codePoints(g.text),
  ].filter(Boolean);
  const risky = riskyGlyphs(g.text);
  const notes = [
    g.note,
    risky.length ? `${risky.join(" ")} has an emoji form: some apps draw it 2 columns wide.` : undefined,
  ].filter(Boolean);
  return [
    `### ${g.name}`,
    fence(body),
    g.frames ? fence(g.frames.join(" ")) : "",
    notes.map((n) => `> ${n}`).join("\n\n"),
    `_${facts.join(" · ")}_`,
    g.keyword ? `Snippet: \`${g.keyword}\`` : "",
    hint,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export default function Command() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const all = useMemo(() => GROUPS.flatMap((group) => group.glyphs.map((g) => ({ id: idOf(group.title, g), g }))), []);
  const selected = all.find((x) => x.id === selectedId)?.g;
  const frame = useFrame(selected);

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Search glyphs: check, elbow, spinner, big arrow…"
      onSelectionChange={setSelectedId}
    >
      {GROUPS.map((group) => (
        <List.Section key={group.title} title={group.title}>
          {group.glyphs.map((g) => {
            const id = idOf(group.title, g);
            const multi = isMultiLine(g);
            const firstFrame = g.frames?.[0];
            return (
              <List.Item
                key={id}
                id={id}
                title={multi ? g.name : g.frames ? g.frames.slice(0, 4).join(" ") : g.text.trimEnd()}
                subtitle={multi ? undefined : g.name}
                keywords={[g.name, ...(g.aliases ?? []), ...(g.keyword ? [g.keyword] : []), group.title]}
                detail={<List.Item.Detail markdown={detailMarkdown(g, group.hint, id === selectedId ? frame : 0)} />}
                actions={
                  g.frames && firstFrame ? (
                    <ActionPanel>
                      <Action.Paste title="Paste Frame" content={firstFrame} />
                      <Action.CopyToClipboard title="Copy All Frames" content={g.frames.join(" ")} />
                      <Action.CopyToClipboard
                        title="Copy as JS Array"
                        content={JSON.stringify(g.frames)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy as Spinner Definition"
                        content={JSON.stringify({ interval: g.interval, frames: g.frames })}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                      />
                    </ActionPanel>
                  ) : (
                    <ActionPanel>
                      <Action.Paste title="Paste" content={g.text} />
                      <Action.CopyToClipboard title="Copy" content={g.text} />
                      {multi ? (
                        <Action.CopyToClipboard
                          title="Copy as Code Block"
                          content={fence(g.text)}
                          shortcut={Keyboard.Shortcut.Common.Copy}
                        />
                      ) : null}
                      {g.keyword ? (
                        <Action.CopyToClipboard
                          title="Copy Snippet Keyword"
                          content={g.keyword}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                        />
                      ) : null}
                    </ActionPanel>
                  )
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
