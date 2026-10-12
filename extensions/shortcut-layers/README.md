# Shortcut Layers

Layered keyboard shortcuts for Raycast. One hotkey opens a layer, then a single key
runs an action. It's the Karabiner layer model without Karabiner.

```
✦A     open the Applications layer
b      open the browser
```

## Why layers

A layer groups `key → action` bindings. Pick letters that remind you of the action:
`O` for Obsidian, `n` for New note, `d` for Daily note. A handful of layers is
easier to keep in your head than dozens of flat global hotkeys, and each layer
scopes its letters, so `d` can mean Daily note in Notes layer and Downloads in
Files/Directories layer.

Opening a layer shows a panel listing every action and the key that runs it, so you
don't have to remember the letters. The panel stays in front while the layer is
active.

## Commands

| Command       | Description                                                                |
| ------------- | -------------------------------------------------------------------------- |
| Run Layer     | The runner. Press a key to fire an action. Opens a picker if run directly.  |
| Manage Layers | Create and edit layers and their single-key actions.                       |
| Import Layers | Merge layers from a JSON file or pasted text.                              |
| Export Layers | Write all layers to a timestamped JSON file in `~/Downloads`.            |

## Setup

1. Run Manage Layers and choose Create Layer. Name it, for example `Obsidian`.
2. Choose Open Layer, then add actions with a single key:
   - Application: a searchable list of installed apps, or type a path
   - File / Folder: Spotlight search, or type a path
   - URL / Deeplink: `raycast://extensions/...`, `notes://`, or `https://mail.google.com`
   - Shell Command: `open -a Ghostty`

   The Key is one character, and case-sensitive, so `d` and `D` can be different
   actions.
3. Choose Create Quicklink (first time only). It makes a Quicklink pointing at Run
   Layer with the layer already set. Save the prefilled form. You need one
   Quicklink per layer.
4. Choose Set or Update Hotkey. It opens Raycast's Search Quicklinks filtered to
   that Quicklink, where you set the hotkey, for example `⌃⌥⌘O`.

Pressing the hotkey now opens the layer. A single key runs the action and the panel
closes.

> Raycast gives extensions no API to read or modify Quicklinks. `Action.CreateQuicklink`
> also has no callback after saving, so step 4 takes a couple of clicks instead of
> happening automatically.

## Import / export

The Export Layers command writes `~/Downloads/shortcut-layers-<date>-<time>.json`.

The Import Layers command merges a pasted or picked JSON file. Layers match by `id`
and actions by `key`. New layers are appended. In a matched layer an action is added
only if its key is unused, so import never overwrites or removes existing actions.

A file is rejected, naming the offending rows, when it repeats a layer id, repeats a
key within a layer, or contains an action with no key.

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

`id` is optional on import, where it is derived from `name`. Action `kind` is one of
`app`, `file`, `url`, `shell`.

## How it works

Raycast can't register commands or hotkeys at runtime, so one command (Run Layer)
opens whichever layer its launch context names. Each layer's Quicklink carries that
in the deeplink:

```
raycast://extensions/rhrabun/shortcut-layers/run-layer?context={"layer":"obsidian"}
```

Running Run Layer from Root Search with no context opens the layer picker.

Inside a layer, keystrokes go to a controlled search bar. A single key matches an
action and fires it, and `esc` closes the layer.

## Limitations

- Each Quicklink's hotkey is assigned by hand. Raycast has no API to set it. This is
  true of every extension.
- Opening a layer shows and focuses the Raycast panel, so there is a brief flash. It
  can't run invisibly.
- File and folder search uses the Spotlight index, so an unindexed path won't show
  up in the list. Type the path instead and pick it.
- macOS only for now.
