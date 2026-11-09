# NodebookMD

Search the Houdini documentation from Raycast. Results come from
[NodebookMD](https://nodebook.md), which keeps the docs of your Houdini install
offline. Pages open in the app.

## Setup

Install NodebookMD and open it once, so it indexes the docs. The extension
starts the app when it is not running.

## Use

- Type a name, a part of a name, or the first letters of its words: `box`,
  `copy to points`, `cptp`.
- Start with a shorthand to search one part of the docs: `v:` (VEX functions),
  `sop:`, `lop:`, `dop:`, `cop:`, `vop:`, `py:` (Python), `e:` (expressions),
  `hs:` (HScript), `ex:` (examples).
- With nothing typed, the list shows the pages you opened from Raycast. `h:`
  searches only those pages.

| Action              | macOS | Windows      |
| ------------------- | ----- | ------------ |
| Open in NodebookMD  | Enter | Enter        |
| Copy as Markdown    | ⌘⇧C   | Ctrl+Shift+C |
| Open on SideFX      | ⌘⇧O   | Ctrl+Shift+O |
| Remove from History | ⌃X    | Ctrl+D       |
| Clear History       | ⌃⇧X   | Ctrl+Alt+D   |

## Try it before it is in the Store

1. Install [Node.js](https://nodejs.org) 22 or later and Raycast.
2. In this folder, run `npm install`, then `npm run dev`.
3. Raycast imports the extension. You can then close the terminal: the extension stays in Raycast.
