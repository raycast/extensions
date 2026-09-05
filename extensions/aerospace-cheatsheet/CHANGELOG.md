# AeroSpace Cheatsheet Changelog

## [Initial Version] - {PR_MERGE_DATE}

Five commands for working with [AeroSpace](https://nikitabobko.github.io/AeroSpace/)
from Raycast.

The cheatsheet reads your `aerospace.toml` and shows every binding with a readable
name, the key drawn in real glyphs, and the raw command a keystroke away. Rows are
grouped by what they do rather than listed flat, and three merge rules collapse the
repetition a config accumulates: one command bound to several keys becomes a single
row, mirrored pairs like `resize width -50` and `+50` fold together, and a numeric run
of workspace switches shows as a range. A typical config drops from 66 bindings to 37
rows.

Bindings that change the window layout carry a before-and-after diagram. Recipes walk
through arrangements worth knowing how to build, naming the key from your own config at
each step, and saying so when a step needs a command you have not bound.

Bindings can be changed without leaving Raycast. A form on any row edits that
binding's key and command, and another adds or removes one. Edits rewrite the single
line they affect and leave the rest of the file alone, comments and column alignment
included, rather than parsing the config and writing it back out. Every change is
re-parsed and then checked with `reload-config`; if AeroSpace rejects it, the config is
restored exactly as it was.

Alongside it: Go to Workspace; Switch Windows, which groups every window by the
workspace it sits on and can focus it, pull it to the current workspace, or tile and
float it; Move Window to Workspace, which will create a workspace whose name you type;
Bring Workspace to This Display; Toggle AeroSpace and Reload AeroSpace Config as
one-press commands; Show AeroSpace Config; and a menu bar command with the current
workspace and common layout actions.
