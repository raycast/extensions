# Shh Links

Discord adds a preview card under every link you send. Wrapping the URL in angle brackets stops it, but typing `[text](<url>)` by hand is tedious. This extension builds that markup for you and pastes it straight into Discord's message box, so you can still read it over before you press Enter.

## Commands

### Paste Link Without Embed

Opens a form before pasting:

- **Text** starts with the site's name, or with the words you had selected in Discord. Edit it, or clear it to paste a bare `<url>`.
- **URL** is filled in from the clipboard. It takes one link or a whole list.
- **Result** shows exactly what will be pasted.

Press `↵` to paste into Discord, or use **Copy Link** to copy the result instead.

### Paste Clipboard Without Embed

No form: the links on the clipboard go into Discord right away, each one named after its site. Assign it a hotkey to turn "copy, paste, delete the embed" into one keystroke.

## What gets pasted

| On the clipboard                           | Pasted into Discord                                    |
| ------------------------------------------ | ------------------------------------------------------ |
| `https://github.com/bchagas/dotfiles`      | `[github](<https://github.com/bchagas/dotfiles>)`      |
| The same link, with the text `my dotfiles` | `[my dotfiles](<https://github.com/bchagas/dotfiles>)` |
| The same link, with the text cleared       | `<https://github.com/bchagas/dotfiles>`                |
| `see https://www.bchagas.com.`             | `see [bchagas](<https://www.bchagas.com>).`            |

In a list, every link gets its site's name, and names that repeat are numbered so the links can be told apart:

```
[github 1](<https://github.com/bchagas/dotfiles>)
[bchagas](<https://www.bchagas.com>)
[github 2](<https://github.com/bchagas>)
```

Text around the links is kept. A masked link such as `[docs](https://…)` keeps its text and only gains the angle brackets, and a link already in angle brackets is left as it is.

## Selecting text in Discord

Select words in Discord's message box before running either command and they become the link text: the pasted link replaces them. Text selected in any other app is ignored.

## Preferences

- **Remove tracking parameters** (on by default): drops `utm_*`, `fbclid`, `gclid` and similar parameters, and keeps every other part of the URL as written.

## Good to know

- Works with Discord, Discord PTB and Discord Canary.
- The extension pastes but never sends: the message stays in the box until you press Enter.
- If Discord is closed, the link is copied to the clipboard instead.
- Discord limits a message to 2,000 characters (4,000 with Nitro). The form warns you when the result is longer.
