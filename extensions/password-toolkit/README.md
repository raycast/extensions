<p align="center">
    <img src="./assets/password-toolkit-icon.png" width="150" height="150" />
</p>

# Password Toolkit

A Raycast extension for customizable passwords and passphrases on macOS and Windows.

## Settings

- **Passphrases**: 1–64 words, capitalization, a random digit, separators, and format presets. Default: six capitalized, hyphen-separated words with one digit.
- **Passwords**: 4–64 characters (default: 12), selectable character types, custom Unicode symbols, and character exclusions.
- **Clipboard**: optional pasting, confirmation HUD, and cleanup after 60 seconds if the clipboard is unchanged.

Configure these in Raycast's extension preferences. Custom fields apply only with **Use Custom Separator** or **Use Custom Pattern**.

## Custom Patterns

| Placeholder | Output |
| --- | --- |
| `{word}` | One word; optional `:uppercase`, `:lowercase`, or `:capitalize` |
| `{words}` | Current word count and separator; same case modifiers |
| `{number:random}` | One digit in one randomly chosen occurrence |
| `{number:n}`, `{symbol:n}`, `{random:n}` | `n` digits, symbols, or mixed characters |

`n` is 1–64; omitting it produces one character.

## Word Sources

Uses distinct lowercase system words of 6–12 letters when at least 7,776 remain; otherwise, uses the bundled [EFF long word list](https://www.eff.org/dice).

## Security

- Uses cryptographic randomness. Words are sampled independently and can repeat.
- Passphrase formats weaker than six EFF words require confirmation. Capitalization and fixed text receive no strength credit.
- Secrets are never saved to disk or sent over the network. Confidential copies are excluded from Raycast Clipboard History.
- Clipboard cleanup is best-effort and requires the command to remain running.
