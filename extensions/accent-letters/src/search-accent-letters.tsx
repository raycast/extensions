import { Action, ActionPanel, Clipboard, Icon, List, showHUD } from "@raycast/api";
import { useMemo } from "react";
import letters from "../data/letters.json";

type Letter = {
  c: string;   // the character
  n: string;   // Unicode name
  u: string;   // code point, e.g. "00E9"
  d: string;   // friendly description
  m?: string;  // the accent mark(s), e.g. "Acute"
  l?: string[];// language codes that use it
  t?: string;  // the shared search string
};

type Data = { letters: Letter[]; langs: Record<string, string> };

const data = letters as Data;

/**
 * Raycast filters the list itself, indexing `title` and `keywords` only — NOT `subtitle` and NOT
 * `accessories`. So every token someone might type has to be in `keywords`, or it simply will not
 * match. That is the whole reason this command earns its place next to Raycast's built-in symbol
 * search: "polish", "two dots" and "00e9" all resolve here, and none of them resolve there.
 *
 * Deliberately no `onSearchTextChange`: supplying one implicitly turns Raycast's own filtering off.
 */
function keywordsFor(letter: Letter, langs: Record<string, string>): string[] {
  const words = new Set<string>();
  words.add(letter.c);
  words.add(letter.u.toLowerCase());
  words.add(`u+${letter.u.toLowerCase()}`);
  if (letter.m) for (const w of letter.m.split(/[^A-Za-z]+/)) if (w) words.add(w.toLowerCase());
  for (const code of letter.l ?? []) {
    words.add(code);
    const name = langs[code];
    if (name) for (const w of name.split(/[^A-Za-z]+/)) if (w) words.add(w.toLowerCase());
  }
  // The shared search string carries the plain-English wordings ("two dots", "accent going up")
  // that the rest of Accent Letters is searchable by; keep them working here too.
  if (letter.t) for (const w of letter.t.split(/\s+/)) if (w.length > 1) words.add(w.toLowerCase());
  return [...words];
}

export default function Command() {
  const items = useMemo(
    () =>
      data.letters.map((letter) => ({
        letter,
        keywords: keywordsFor(letter, data.langs),
        languages: (letter.l ?? []).map((c) => data.langs[c]).filter(Boolean),
      })),
    [],
  );

  return (
    <List searchBarPlaceholder="Letter, language, accent mark, Unicode name or code point…">
      {items.map(({ letter, keywords, languages }) => (
        <List.Item
          key={letter.u}
          title={letter.c}
          subtitle={letter.d}
          keywords={keywords}
          accessories={[
            ...(letter.m ? [{ text: letter.m }] : []),
            ...(languages.length ? [{ text: languages.slice(0, 3).join(", ") }] : []),
            { text: `U+${letter.u}` },
          ]}
          actions={
            <ActionPanel>
              <Action.Paste title="Paste Letter" content={letter.c} icon={Icon.Text} />
              <Action.CopyToClipboard
                title="Copy Letter"
                content={letter.c}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              <Action
                title="Copy HTML Entity"
                icon={Icon.Code}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                onAction={async () => {
                  await Clipboard.copy(`&#x${letter.u};`);
                  await showHUD(`Copied &#x${letter.u};`);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
