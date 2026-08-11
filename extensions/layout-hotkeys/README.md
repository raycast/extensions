# Layout Hotkeys

Jump straight to a specific keyboard layout with a hotkey, instead of cycling through them.

macOS only offers "select next input source", so reaching Hebrew from a list of four layouts means pressing the switch
key three times. This extension gives you four commands you can bind independent global hotkeys to, each landing
directly on the layout you assign it.

## Commands

| Command | What it does |
| --- | --- |
| **Switch to Layout 1–4** | Switch straight to the input source assigned to that slot. Bind a global hotkey to each. |
| **Convert Selection to Layout 1–4** | Rewrite the selected text as if it had been typed with that slot's layout. |
| **Convert Selection** | Preview the selection rewritten into each of your layouts and pick one. |
| **Configure Layout Slots** | Choose which input source each slot selects. |
| **Switch Input Source** | Browse enabled input sources and switch to one. |
| **Cycle Input Source** | Move to the next enabled input source. |
| **Show Current Input Source** | HUD showing the active input source. |

## Setup

1. Enable the layouts you want in *System Settings › Keyboard › Input Sources*.
2. Run **Configure Layout Slots** and pick an input source for each slot. Unconfigured slots fall back to your first
   four enabled layouts in system order, so the hotkeys do something sensible right away.
3. In Raycast Settings › Extensions, record a global hotkey for each **Switch to Layout _n_** command.

The post-switch HUD is off by default: it keeps Raycast on screen for a beat after the switch, which makes an otherwise
instant hotkey feel slow. Turn it on in preferences if you want the confirmation.

The hotkeys never dismiss the Raycast window, so they also work while you are typing in Raycast's own search field — press
one and carry on searching in the other language. The consequence is that running a **Switch to Layout** command from the
root search switches Raycast's layout rather than your app's, because Raycast is the app in front at that moment. Use the
hotkey from your app for that, or the **Switch Input Source** picker, whose action does hand focus back.

## Fixing text typed in the wrong layout

Type `privet` with the U.S. layout active when you meant Russian, select it, and press a **Convert Selection to Layout**
hotkey: it becomes `привет`, and the input source switches so you can carry on typing. It works in either direction and
between any pair of your layouts — select Hebrew text and convert it back to U.S. just the same.

The layout the text was typed with is detected automatically, so there is nothing to configure beyond the slots you
already set. Characters both layouts share — spaces, digits, most punctuation — pass through untouched.

If you have not selected anything, the whole focused field is converted instead, which is usually what you want in a
search box, a chat input, or a URL bar. Because that same behaviour would rewrite an entire document if the focused
"field" happens to be one, anything longer than 200 characters asks for confirmation first, and ⌘Z undoes it either way.
Set *When Nothing Is Selected* to "Do nothing" in preferences to turn the fallback off.

Rather than shipping hardcoded per-language character tables, the mapping is derived from the layouts themselves: for
each character, Carbon's `UCKeyTranslate` says which physical key and modifiers produced it under the detected layout,
and what that same key produces under the target. Every enabled layout therefore works, including custom `.keylayout`
bundles built with Ukelele, with nothing to maintain per language.

Turn off *Switch to the target layout* in preferences if you would rather the input source stay put after a conversion.

## How it works

Selecting an input source needs Carbon's `TISSelectInputSource`, which is not reachable from TypeScript, so that part
lives in Swift and is bridged with [raycast/extensions-swift-tools](https://github.com/raycast/extensions-swift-tools).
The switching commands need no permissions at all: no Accessibility, no Input Monitoring, and no synthesized keystrokes.

The **Convert Selection** commands read the frontmost app's selection, which does require Raycast itself to hold
Accessibility permission. macOS prompts for it the first time, and it is a Raycast-level permission rather than anything
this extension asks for separately.

When a Raycast command fires, Raycast is briefly the frontmost app. If macOS's *"Automatically switch to a document's
input source"* is on, switching while Raycast holds focus can be undone the moment focus returns to your app. The Swift
side therefore waits (up to 400 ms) for Raycast to stop being frontmost before calling `TISSelectInputSource`.

## Known limitations

- Only *enabled* input sources can be selected. Choosing an installed-but-disabled source fails with a clear error
  rather than silently doing nothing.
- Text conversion needs a layout to expose Unicode key layout data. Input methods that do not — CJKV ones in particular
  — can still be switched to, they just cannot be a conversion source or target.
- Layouts that produce the same characters cannot be told apart when detecting what the text was typed with. U.S. and
  Polish Pro both cover plain ASCII, for instance. This is harmless, because they map those characters to the same
  physical keys and so produce the same conversion.
- `TISSelectInputSource` has a long-standing bug with CJKV **input methods**, where the menu bar icon changes but typing
  does not follow. Plain keyboard layouts — Hebrew, Polish, Russian, Latin variants — are unaffected.
