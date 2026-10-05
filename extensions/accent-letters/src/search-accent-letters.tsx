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

/** "māori" → "maori": the same word without its accents, so a name matches however it is typed. */
const fold = (word: string) => word.normalize("NFD").replace(/\p{M}/gu, "");

/**
 * The words in a name, lowercased, each with an accent-free copy where it differs. Splitting on
 * [^A-Za-z] instead cut "Māori" into "m" and "ori", so "maori" found nothing — and the stray "m"
 * matched every letter Māori uses. One-letter fragments are dropped for the same reason.
 */
function tokens(text: string): string[] {
  const out: string[] = [];
  for (const word of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (word.length < 2) continue;
    out.push(word);
    const plain = fold(word);
    if (plain !== word) out.push(plain);
  }
  return out;
}

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
  if (letter.m) for (const w of tokens(letter.m)) words.add(w);
  for (const code of letter.l ?? []) {
    words.add(code);
    const name = langs[code];
    if (name) for (const w of tokens(name)) words.add(w);
  }
  // The shared search string carries the plain-English wordings ("two dots", "accent going up")
  // that the rest of Accent Letters is searchable by; keep them working here too.
  // Each word whole, so "u+00e1" and "alt+0225" still match as typed, and also in clean pieces, so
  // "hacek" and "háček" find what the data writes as "(háček)". tokens() drops one-letter pieces, so
  // "u+00e1" never adds a bare "u" to every letter.
  if (letter.t) {
    for (const w of letter.t.toLowerCase().split(/\s+/)) {
      if (w.length < 2) continue;
      words.add(w);
      for (const piece of tokens(w)) words.add(piece);
    }
  }
  // The dataset's search string carries the FRIENDLY description ("small a with acute accent"), not
  // the Unicode name, so "latin" matched nothing even though the listing advertises full-name
  // search. Index the real name too.
  for (const w of letter.n.split(/[^A-Za-z0-9]+/)) if (w.length > 1) words.add(w.toLowerCase());
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
