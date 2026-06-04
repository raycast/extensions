# Harmonic

A Raycast extension for searching musical notes and chords, viewing their frequencies, and playing them as tones.

## Features

### Search Notes

Search by name using natural language ("A flat", "C sharp") or symbols ("Ab", "C#", "Bb"). Select a note to see all octaves (0-8) with:

- Frequency in Hz
- MIDI note number
- Octave range label (Sub-bass through Extreme)
- Notable labels (Middle C, Concert A, etc.)

### Search Chords

Search using lead sheet / chord symbol notation:

- Triads: `C`, `Dm`, `Edim`, `Faug`, `Gsus4`
- Seventh chords: `Cmaj7`, `Dm7`, `G7`, `Am7b5`
- Extended: `C9`, `Dm11`, `G13`
- Altered: `G7#9`, `C7b5`, `D7#11`
- Jazz voicings: `Cmaj7#11`, `Dm6/9`, `G7alt`

Chord types are labeled by category (Triad, Seventh, Extended, Altered, Jazz, Lydian, Modal) and autocomplete as you type.

### Audio Playback

- **Tone types**: Warm (default), Pure Sine, Bright, Soft Decay
- **Durations**: 1s, 2s (default), 5s, or infinite
- **Stack pitches** by playing multiple notes or chords
- **Stop all** with `Cmd+Shift+S`

## Install

```bash
npm install
npm run dev
```

Then open Raycast and search for "Search Notes" or "Search Chords".

## Keyboard Shortcuts

| Shortcut      | Action                       |
| ------------- | ---------------------------- |
| `Cmd+1`       | Play for 1 second            |
| `Cmd+2`       | Play for 2 seconds           |
| `Cmd+5`       | Play for 5 seconds           |
| `Cmd+0`       | Play infinitely              |
| `Cmd+Shift+S` | Stop all playback            |
| `Cmd+C`       | Copy frequency / chord notes |
| `Cmd+Shift+C` | Copy note name / frequencies |
