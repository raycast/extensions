# Type Out

Raycast extension that **types out text character by character** into the frontmost
application instead of pasting it in one shot. Built for places where paste is
disabled or discouraged: VMs, remote desktops, chat inputs with anti-paste checks,
forms that detect clipboard drops, etc.

## How it works

1. The command reads your **clipboard** (or the text you type as an argument in Raycast).
2. It closes the Raycast window so focus returns to the app you were using.
3. It waits a short "start delay", then sends one `keystroke` per character via
   AppleScript `System Events`, with a small delay between characters — like a
   typewriter. Newlines are sent as Return, tabs as Tab.

## Requirements

- macOS with [Raycast](https://raycast.com)
- Node.js 22.14+ and npm 7+
- **Accessibility permission** for Raycast:
  System Settings → Privacy & Security → Accessibility → enable **Raycast**
  (needed so it can send keystrokes to other apps). If it isn't granted, the
  command shows a HUD reminding you.

## Development

```bash
npm install
npm run dev
```

Open Raycast and run **Type Out Text**. Hot-reload is enabled while `npm run dev`
is running; the extension stays installed afterwards.

## Usage

- **From the clipboard:** copy any text, focus the target input, then run
  `Type Out Text` (assign a hotkey for one-handed use).
- **From an argument:** in Raycast, run `Type Out` and keep typing —
  whatever you enter is typed out into the previous app.
- **From history:** run `Type Out from History` to see your six most recent
  clipboard text entries; press ↵ (or ⌘K → Type Out Now) on one to type it out.
- Optional **press Return** preference to submit forms when typing finishes.

> Note: Raycast does not allow extensions to add actions to the built-in
> Clipboard History's action panel, so `Type Out from History` mirrors the
> recent entries instead (the Clipboard API exposes the 6 latest text items).

## Preferences (Raycast → Extensions → Type Out)

| Preference | Default | Meaning |
| --- | --- | --- |
| Typing Speed | `25` ms | Delay between characters (5–1000 ms) |
| Start Delay | `300` ms | Wait after the Raycast window closes, so the target app has focus |
| Press Return | off | Press Return once all characters are typed |

Preferences live at the extension level, so both commands share them.

## Limitations

- Emoji and astral-plane characters may type incorrectly on some keyboard
  layouts — AppleScript `keystroke` sends them through the layout.
- There is no mid-run abort; if a very long run goes wrong, quit it with
  `pkill osascript` (or lower the text size / raise Typing Speed).
