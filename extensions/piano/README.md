# Piano for Raycast

A playable piano that lives entirely inside Raycast. It uses Raycast's native Detail and Action Panel APIs and
MIT-licensed MuseScore piano recordings for a natural acoustic sound.

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

Audio samples are bundled with the extension and played locally through `/usr/bin/afplay`; the extension makes no
network requests. Playback is capped at eight simultaneous notes, every player has a watchdog, and all playback is
stopped when the command closes.

Samples are derived from
[Leethring/piano-sound-samples](https://github.com/Leethring/piano-sound-samples) under the MIT License. See
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
