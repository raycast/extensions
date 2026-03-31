# Input Source Switcher

Switch keyboard layouts and input methods by name — no cycling required.

## Why

macOS cycles through input sources with Cmd+Space and Cmd+Option+Space. For users with two or three layouts, cycling is workable. For users with many layouts — multiple Cyrillic scripts, CJK input methods, Latin variants — it is not.

This extension lets you type a layout name and jump to it directly.

## Usage

Open Raycast and run **Switch Input Source**. A list of all your enabled input sources appears. Type to filter, press Enter to switch.

| You type | Raycast shows | Result |
|---|---|---|
| `pinyin` | Pinyin — Simplified Chinese | switches to SCIM ITABC |
| `by` or `bela` | Belarusian | switches to Belarusian layout |
| `jp` or `japanese` | Japanese (Romaji) | switches to Kotoeri |
| `ru` | Russian | switches to Russian layout |

A HUD confirms the switch.

## Search aliases

Common layouts have short aliases built in:

| Layout | Aliases |
|---|---|
| Belarusian (shown as "Byelorussian" internally) | `by`, `bel`, `belarusian`, `byelorussian` |
| Pinyin — Simplified Chinese | `pinyin`, `zh`, `chinese`, `cn`, `simplified` |
| Japanese (Romaji) | `jp`, `japanese`, `romaji`, `ja` |
| English (US Extended) | `us`, `en`, `english`, `latin` |
| Ukrainian (PC) | `uk`, `ua`, `ukrainian` |
| Polish (Pro) | `pl`, `polish` |
| Russian | `ru`, `russian` |

Any layout not in the list above is still searchable by its full localized name.

## Requirements

- macOS 13 or later
- Raycast 1.93 or later

## How it works

The extension bundles a small Swift helper (`InputSourceHelper`) that calls the macOS Carbon Text Input Sources API (`TISCreateInputSourceList`, `TISSelectInputSource`). No Accessibility permissions are required.

Non-keyboard input sources (Character Palette, Press and Hold) are filtered out automatically.

## Known limitations

- **Input mode sub-switching** (e.g. switching directly between Kotoeri Hiragana and Katakana) is not supported in v1. Selecting Kotoeri activates the input method; sub-mode selection is left to the user.
- The pre-built helper binary targets macOS 13+ (universal, arm64 + x86_64).
