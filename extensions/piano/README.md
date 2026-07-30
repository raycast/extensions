# Piano for Raycast

A playable piano that lives entirely inside Raycast. It uses Raycast's native Detail and Action Panel APIs and synthesizes its own audio locally.

## Play

| Control | Action |
| --- | --- |
| `A W S E D F T G Y H U J K` | Play C through the next C |
| `←` / `→` | Shift octave |
| `Space` | Toggle sustain |
| `⇧ ↑` / `⇧ ↓` | Change volume |

The notes are also available as clickable actions in Raycast's action panel (`⌘ K`).

## Install locally

1. Install [Raycast](https://www.raycast.com/).
2. Run `npm install`.
3. Run `npm run dev`.
4. Search for **Play Piano** in Raycast.

Audio is generated on-device as short WAV files and played through `/usr/bin/afplay`. No network access or sample library is needed.
