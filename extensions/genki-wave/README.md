# Genki Wave

Use the buttons and swipes on your [Genki Wave](https://genkiinstruments.com) ring
with Raycast: dictate into any app, move through slides, control media and
volume, or run any Raycast command, without touching the keyboard.

## Getting started

1. Open **Configure Wave**. The first time, the extension downloads its small
   background helper (signed and notarized by Genki Instruments) and starts it.
2. Turn the ring on (middle button) and keep it close to your Mac. The first
   Wave found is remembered as yours; **Choose Wave…** picks another.
3. macOS asks once to let `wave-helper` use Bluetooth, and once for
   Accessibility, which it needs to press keys and type dictation for you.

## Mapping buttons and swipes

Select a button or swipe in **Configure Wave** and press ↵ to choose what it
does:

- **Dictate & Send** or **Dictate as Draft**: Raycast Dictation transcribes,
  and the text is typed into the app you choose for that button, then sent
  with Return or left as a draft. Hold to talk, or click to start and again to
  stop. Set Raycast Settings → Extensions → Dictation → Output to "Copy to
  Clipboard".
- **Slides**: next and previous slide, start the slideshow, black or white
  screen, in Keynote, PowerPoint, Google Slides and PDF viewers.
- **Media**: play/pause, next and previous track, mute, and hold-and-turn
  volume.
- **Key…**: arrow keys, Space, Return, Escape, Tab, Delete, Page Up, Page Down,
  Home, or End, with optional Control, Option, Shift, and Command modifiers.
- **Raycast Command or URL…**: any deeplink (select a command in Raycast,
  press ⌘K, **Copy Deeplink**).

⌘⇧P applies a presentation layout to all buttons and swipes at once.

The top of **Configure Wave** shows whether the ring is connected and its
battery, and anything that needs your attention.

## Troubleshooting

Configure Wave says what's wrong when the ring can't be reached (Bluetooth off
or not allowed, the ring in use by another app, firmware too old) and offers a
fix. If it still doesn't work, press ⌘⇧C in Configure Wave to copy diagnostics
and send them to Genki Instruments.

The ring is used through a background helper, as Raycast extensions can't
keep a Bluetooth connection themselves. Its releases are at
[genkiinstruments/genki-wave-helper](https://github.com/genkiinstruments/genki-wave-helper);
the extension checks each download against a pinned SHA-256. To use a copy
you installed yourself, set **Helper Path** in the extension's preferences.
