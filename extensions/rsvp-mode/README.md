# RSVP Mode

Speed-read articles word-by-word with synced local text-to-speech, right inside Raycast.

RSVP Mode pulls any article into a clean reader, pre-renders the entire piece to audio with the macOS `say` command, then flashes one word at a time with an optimal-recognition-point (ORP) indicator while the audio plays in lockstep. Pre-rendering eliminates the cold-start lag of streaming TTS and lets the visual flash align with the actual audio duration of each chunk — no drift, no mid-sentence racing.

## Heritage

This extension is built on top of three excellent open-source projects. RSVP Mode wouldn't exist without them:

- **[Reader Mode](https://www.raycast.com/chrismessina/reader-mode)** by **Chris Messina** ([@chrismessina](https://github.com/chrismessina)) — RSVP Mode is forked from Reader Mode. The entire article-extraction pipeline (site-specific extractors, Mozilla Readability fallback, paywall hopper, browser-extension content recovery, Safari/Chrome/Arc/Edge/Brave URL resolution) comes from there. Without Chris's work, this extension would be ~10× more code to write.
- **[Say – Text to Speech](https://www.raycast.com/litomore/say)** by **[litomore](https://github.com/litomore)** — pattern for invoking macOS `say` from a Raycast extension and the inspiration to keep TTS fully local rather than depending on cloud APIs.
- **[speed-reader](https://github.com/aaronpowell/speed-reader)** by **Aaron Powell** ([@aaronpowell](https://github.com/aaronpowell)) — the RSVP timing algorithm, the Optimal Recognition Point heuristic (per-letter focal position with stepped offset), and the tokenization approach are ported from Aaron's browser extension.

What's new in RSVP Mode (not in any of the above):
- Pre-rendered audio synthesis to AIFF files for zero cold start and exact per-chunk duration.
- Sentence-level visual/audio sync derived from `afinfo` measurements rather than guessed WPM.
- Smart chunking: under-20-word sentences merge with neighbors; over-300-word sentences split at commas/parens.
- Image-aware chunks that render inline and pause for 2.5 seconds.
- AppleScript fallback for browsers when Raycast's Browser Extension API isn't connected.

## Features

- **Three entry points** — RSVP a URL, the URL on your clipboard, or the current browser tab. Works with Safari, Chrome, Arc, Edge, Brave, Vivaldi.
- **Pre-rendered audio** — synthesizes every chunk in parallel to AIFF files using local macOS voices, then plays them back via `afplay`. No streaming cold start.
- **Perfect sync** — visual word-flash timing is derived from each chunk's actual audio duration, so the focal letter lands exactly when the voice speaks the word.
- **Smart chunking** — sentences under 20 words merge with the next; sentences over 300 split at the nearest comma or paren.
- **Centered ORP display** — classic ▼/▲ arrows pinned at a fixed column; words slide left/right so the focal letter sits beneath the arrows.
- **Images pause playback** — image-only paragraphs render inline and hold for 2.5 seconds before advancing.
- **Local & private** — no cloud TTS, no network calls during playback. Premium voices download to your machine once, then synthesize offline.

## Setup

1. Install the extension from the Raycast Store.
2. (Recommended) Download a Premium voice: **System Settings → Accessibility → Spoken Content → System Voice → Manage Voices**. Try Ava, Zoe, or Evan — they're night and day vs. the defaults.
3. Open RSVP Mode preferences in Raycast and set the **Voice** field to the exact voice name (e.g. `Ava (Premium)`).

## Commands

| Command | Description |
|---------|-------------|
| **RSVP a URL** | Speed-read a URL provided as an argument or via a form. |
| **RSVP Clipboard URL** | Detect a URL on your clipboard and start reading. |
| **RSVP Current Browser Tab** | Read the active tab in your frontmost browser. |

## Keyboard shortcuts (while reading)

| Action | Shortcut |
|--------|----------|
| Play / Pause | `⌘P` |
| Restart from top | `⌘R` |
| Next sentence | `⌘⇧→` |
| Previous sentence | `⌘⇧←` |
| Faster (+25 WPM) | `⌘]` |
| Slower (−25 WPM) | `⌘[` |
| Mute TTS (visual-only) | `⌘M` |
| Open original URL | `⌘O` |

## Preferences

- **Reading Speed (WPM)** — default 320. The visual flash and the pre-rendered audio both honor this rate.
- **Voice** — exact macOS voice name. Leave blank for the system default. Run `say -v ?` in Terminal to list installed voices.
- **Text-to-Speech** — toggle audio. With TTS off, the player flashes at a variable rate (longer pauses on punctuation and long words).
- **Paragraph Pause** — extra silence between paragraphs.
- **Paywall Hopper** — try archive services when the source page is blocked (inherited behavior from Reader Mode).
- **Skip Readability Check** — always attempt RSVP rendering, even on pages the readability heuristic flags as low-content.
- **Debug Logging** — print synthesis and playback diagnostics to the dev console.

## License

MIT. See [LICENSE](./LICENSE) for the full text including attribution to the upstream projects.
