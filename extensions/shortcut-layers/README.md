# Shortcut Layers

Layered keyboard shortcuts for Raycast. One hotkey opens a layer, then a single key runs
an action.

```
✦A   open the Applications layer
b    Open Browser
```

`✦` stands for the Hyper key (⌃⌥⌘). Any free hotkey works.

## What a layer looks like

```
Apps layer
  F  Open Finder
  B  Open Browser
  O  Open Obsidian

Obsidian layer
  N  New note
  D  Daily note
  O  Open vault
  F  Search notes
```

Activating a layer opens a panel that lists every action with the key that runs it, so you
can look at what is available instead of remembering it. Type a key and the action runs.
In Instant mode one key runs its action. In Search mode you type to filter and press enter.
Pick the starting mode in the extension settings.

## Why layers

A layer groups related shortcuts behind one hotkey. `✦O` opens the Obsidian layer, and
inside it `N` writes a new note while `D` opens the Daily note. The keys are mnemonic, so
they are easy to recall, and the same letter can do something else in another layer.

## Commands

| Command       | What it does                                                                               |
| ------------- | ------------------------------------------------------------------------------------------ |
| Run Layer     | Opens a layer and runs its actions. Shows the layer picker when launched without a layer.  |
| Manage Layers | Create, edit, and delete layers and their actions.                                         |
| Import Layers | Merge layers from a JSON file or pasted text.                                              |
| Export Layers | Write every layer to a timestamped JSON file in `~/Downloads`.                             |

## Set up a layer

1. In Manage Layers, choose Create Layer. Give it a name, an icon, and optionally a key
   color. The key color tints the key tags inside that layer.
2. Choose Open Layer and add actions. Each action needs a title, a type, a target, and a
   single trigger key.
3. Choose Create Quicklink. It creates a Raycast Quicklink pointing at Run Layer with the
   layer preselected. Save the prefilled form. You only do this once per layer.
4. Choose Set or Update Hotkey and assign the Quicklink a hotkey, for example `✦O`.

Pressing that hotkey opens the layer. A single key runs the action and the panel closes.

## Action types

| Type           | Target                                                                       |
| -------------- | ---------------------------------------------------------------------------- |
| Application    | a searchable list of installed apps, or a typed path                          |
| File / Folder  | Spotlight search, or a typed path                                            |
| URL / Deeplink | `raycast://extensions/...`, `notes://`, or `https://mail.google.com`         |
| Shell Command  | `killall Dock`                                                              |

Shell commands cover anything the other types do not, for example `killall Dock` restarts
the Dock when it hangs.

Keys are one character and case sensitive, so `d` and `D` can be different actions. A key
must be unique inside its layer, and the layer list flags duplicates.

## Settings

- Default Key Mode: whether a layer starts in instant mode, where one key runs its action,
  or in search mode, where you type to filter and press enter.
- Copy Exported JSON: also copy an export to the clipboard, in addition to writing the
  file.

## Import and export

Export Layers writes `~/Downloads/shortcut-layers-<date>-<time>.json`. With Copy Exported
JSON on, the same JSON also goes to the clipboard. If the file cannot be written it goes to
the clipboard regardless of that setting.

Import Layers merges a pasted or picked JSON file. Layers that share the same `id` merge
into one, and actions match by their key. An action is added only when its key is free, so
import never overwrites or removes an existing action. A file is rejected, naming the
offending rows, when it repeats a layer id, repeats a key inside a layer, or contains an
action with no key.

```json
[
  {
    "id": "obsidian",
    "name": "Obsidian",
    "entries": [
      { "key": "d", "title": "Daily note", "kind": "url", "value": "obsidian://daily" }
    ]
  }
]
```

`id` is optional and derived from `name`. `kind` is one of `app`, `file`, `url`, `shell`.

## Limitations

- The hotkey on each Quicklink is assigned by hand, because Raycast gives extensions no API
  to set one.
- Opening a layer shows and focuses the Raycast panel, so there is a brief flash. It cannot
  run invisibly.
- File and folder search uses the Spotlight index, so an unindexed path will not appear.
  Type the path and pick it instead.
- Shell commands run invisibly. Output is discarded and the panel stays open until the
  command finishes, so a long command keeps it on screen. A failure shows a toast and
  leaves the panel open.
- macOS only.

## How the hotkey works

Raycast cannot register commands or hotkeys at runtime, so Run Layer reads the layer from
its launch context, which each Quicklink carries:

```
raycast://extensions/rhrabun/shortcut-layers/run-layer?context={"layer":"obsidian"}
```

That launch context is why setup has the extra Quicklink step. It is the only way to give
a layer you create its own hotkey.

## Development

```sh
npm install
npm run dev     # hot reload in Raycast
npm test        # unit tests
npm run build
```

`mise run check` runs lint, tests, and the build in one go.
