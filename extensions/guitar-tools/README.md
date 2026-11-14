# Guitar Tools

A Raycast extension that provides tools that guitarists use in separate applications.

## Features

- Chromatic tuner with a large note and octave display, frequency and cents deviation
- Vertical gauge: sharp above the center, flat below it, green within ±3 cents
- Continuous audio capture with visible input level, silence and clipping indicators
- Select your audio input device, pause/resume listening or restart capture
- Saved input selection is preserved; new users start with the macOS default input

### Future Features

- Guitar fretboard practice tool

## Requirements

- macOS
- [SoX](https://sox.sourceforge.net/): install with Homebrew using `brew install sox`
- Allow Raycast to access the microphone in macOS System Settings

## Usage

1. Search for **Chromatic Tuner** in Raycast.
2. Allow a short stabilization period when capture starts.
3. Play one string at a time and let it ring.
4. Bring the cursor to the green center line. Positive cents mean sharp (loosen the string); negative cents mean flat (tighten it).

The reference pitch is A4 = 440 Hz. The tuner accepts detected frequencies from 35 to 1800 Hz. The input level shows RMS dBFS after filtering; it is not the pitch or tuning deviation.

### Audio Input and Controls

Open the Action Panel (`Cmd+K`) to:

- **Select Audio Input Device**: choose an interface or the system default. This changes only the tuner's input, not the Mac's audio settings.
- **Pause Listening / Resume Listening** (`Cmd+Shift+P`).
- **Restart Capture** (`Cmd+R`): refresh device availability and restart the stream.

Capture stops when switching inputs, pausing or leaving the command. The extension does not play back or save your audio, and no audio is sent over the network.

## Troubleshooting

- **SoX not installed**: run `brew install sox`.
- **No audio data / capture failed**: check the interface connection, select the correct input and verify Raycast's microphone permission.
- **Signal received, no note**: play one string at a time. Avoid chords, excessive noise or a signal that is too quiet.
- **Clipping**: reduce the interface's input gain.
- **Disconnected input**: select an available input or reconnect the device, then refresh the list.

Unlike the previous half-second recordings, the capture stays open and feeds overlapping analysis frames. A 30 Hz high-pass filter, residual DC removal and a startup settling period reduce transient interference. Very low frequencies, low-confidence detections and silence are rejected rather than shown as notes.

## Development

```sh
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

Tests cover all six standard guitar strings using synthetic signals, PCM pipe boundaries, capture lifecycle, failure reporting and vertical gauge states. Hardware behavior must also be checked in Raycast with a real instrument; unit tests do not replace that check.
