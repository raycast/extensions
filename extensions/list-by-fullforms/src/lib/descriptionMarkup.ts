// descriptionMarkup — the description field's lightweight markup
// vocabulary, mirrored from the web app's description editor.
//
// On the web, descriptions are rich-edited in Tiptap: `/` opens a
// slash picker that inserts callout line prefixes (DescriptionEditor
// .vue → SLASH_ITEMS) and `@` opens an entry-mention picker that
// inserts a plain-text `[label](#id)` token (entryMentions.js). Both
// store PLAIN TEXT, which is what makes a Raycast port possible at
// all: there is no rich editor here, but the syntax itself is just
// characters in a TextArea.
//
// What Raycast can and cannot do with that:
//
//   * Inline `/` and `@` popups are NOT possible. Form.TextArea is a
//     native control with no keystroke interception, no inline popup
//     surface, and no cursor-position API.
//   * Callouts port well anyway: they are whole-line blocks that
//     naturally end a description, so an action-panel action that
//     APPENDS the prefix (appendCalloutPrefix) loses almost nothing.
//   * Mentions are mid-sentence constructs, so append-at-end is the
//     wrong shape for them. The Raycast-native path is clipboard-
//     shaped instead: a "Copy as Mention" action on Search Entries
//     rows copies the token (mentionToken), and pasting is the one
//     insertion that lands at the caret.
//
// The callout catalog mirrors the web's SLASH_ITEMS callout entries
// verbatim (names, prefixes, hint copy). The web also offers glyph
// tiles under `/`; those are deliberately not ported, since the OS
// emoji/character pickers already insert at the caret and do it
// better than an action-panel submenu could.

import type { Keyboard } from "@raycast/api";
import { shortcutHint } from "./platform";

export interface Callout {
  name: string;
  // The literal line prefix inserted into the description, matching
  // the web's CALLOUT_OPENER_RE vocabulary (`> Example:` etc.), which
  // the read views on every surface promote to styled chips.
  prefix: string;
  // Secondary line for the action's tooltip, same copy as the web
  // picker's hint.
  hint: string;
  // Key for the Cmd+Shift+<key> insert shortcut in the entry forms.
  shortcutKey: Keyboard.KeyEquivalent;
}

export const CALLOUTS: Callout[] = [
  {
    name: "Example",
    prefix: "> Example: ",
    hint: "Highlight a worked example or sample usage",
    shortcutKey: "e",
  },
  {
    name: "Note",
    prefix: "> Note: ",
    hint: "Add an aside, caveat, or reminder",
    shortcutKey: "n",
  },
  {
    name: "Reference",
    prefix: "> Reference: ",
    hint: "Cite a source, document, or external resource",
    shortcutKey: "r",
  },
];

// Append a callout prefix to a description as its own block. Trailing
// whitespace is trimmed first so repeated inserts can't pile up blank
// lines, and the separator is a BLANK line, not a single newline: in
// markdown `> a\n> b` merges into one blockquote, so a single newline
// would fuse a new callout onto the previous one in the Search detail
// pane (the web's line-based parser keeps them apart either way, but
// the stored text should read correctly on both renderers). An empty
// or whitespace-only description gets the bare prefix with no leading
// separator.
export function appendCalloutPrefix(current: string, prefix: string): string {
  const base = (current ?? "").replace(/\s+$/, "");
  return base ? `${base}\n\n${prefix}` : prefix;
}

// The plain-text mention token the web's `@` picker inserts
// (DescriptionEditor.vue serializes mention nodes to exactly this).
// The web read view renders it as a link to the entry; surfaces that
// don't render mentions strip it down to the label server-side.
export function mentionToken(term: string, id: number): string {
  return `[${term}](#${id})`;
}

// ⓘ tooltip for the Description field in Quick Add + the entry
// editor: documents the syntax for people who'd rather type it than
// reach for the action panel, and teaches the mention flow, which has
// no insert action of its own (see the header for why it's clipboard-
// shaped). Function, not a constant, so the shortcut hint renders
// per-OS (Cmd+Shift+M vs Ctrl+Shift+M).
export function descriptionFieldInfo(): string {
  return (
    'Callouts: start a line with "> Example: ", "> Note: ", or ' +
    '"> Reference: " (the action panel can insert these). ' +
    "Mentions: paste an entry's mention token, like [GPS](#123); " +
    `copy one from a Search Entries result with ${shortcutHint(["cmd", "shift"], "m")}.`
  );
}
