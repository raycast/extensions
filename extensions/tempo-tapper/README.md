# Tempo Tapper

A Raycast extension for calculating tempo (BPM) by tapping.

## Usage

Press **Enter** to tap the beat. The BPM is calculated from the intervals between your taps.

Automatically resets after 3 seconds of no taps.

## Shortcuts

| Shortcut | Action |
| -------- | ------ |
| Enter | Tap |
| ⌘M | Switch mode |
| ⌘D | Toggle decimal precision |
| ⌘C | Copy BPM |
| ⌘R | Reset |
| ⌘, | Settings |

## Modes

- **Rolling** - Averages the last few beats (configurable window size)
- **Cumulative** - Averages all beats since start

## Display

- **BPM** - Beats per minute
- **Tempo marking** - Musical term (Largo, Andante, Allegro, etc.)
- **Half/Double time** - BPM ÷ 2 and BPM × 2
- **Ms per beat** - Milliseconds per beat
- **Stability** - Consistency of your taps (Excellent, Good, Fair, Poor)

## Settings

- **Default Mode** - Rolling or Cumulative
- **Rolling Average Window** - Number of beats to average (2, 4, 8, or 16)
