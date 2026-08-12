# Layout Fixer

You meant to type `مرحبا`, but the keyboard was still on English, so the screen
says `lnpfh`. Run the command and it becomes `مرحبا`. It works the other way
too — `اثممخ` typed on a stuck Arabic layout becomes `hello`.

No retyping, no pasting into a website.

## Using it

Bind **Fix Keyboard Layout** to a hotkey (Raycast → Extensions → Layout Fixer),
then hit it whenever you catch yourself typing in the wrong layout.

| Situation | What happens |
| --- | --- |
| Text is selected | The selection is converted in place |
| Nothing selected, cursor in a text field | The whole field is selected and converted |
| Neither | A HUD tells you there's nothing to fix, and nothing is touched |

The direction is detected automatically by counting characters — mostly-Latin
text converts to Arabic, mostly-Arabic text converts to Latin. You never pick a
direction, and running the command twice gets you back where you started.

## Which Arabic layout?

**The Mac and Windows Arabic keyboards are not the same keyboard.** They agree
on the top two letter rows and disagree almost everywhere else — most visibly
across the bottom row:

| key | macOS "Arabic" | Windows "Arabic (101)" |
| --- | --- | --- |
| `n` | ر | ى |
| `v` | د | ر |
| `b` | ز | لا |
| `m` | و | ة |
| `z` `x` `c` | ظ ط ذ | ئ ء ؤ |
| `]` | ة | د |
| digits | ٠١٢٣ | 0123 |

So `مرحبا` is `lnpfh` on a Mac and `lvpfh` on Windows. Getting this wrong
produces plausible-looking nonsense rather than an obvious failure, which is
why it's a preference.

**Arabic Keyboard Layout** defaults to *Match This Computer*, which follows the
OS you're running on. Set it explicitly if that's not what you type on — in
particular, pick **Windows** if you're on a Mac but use the *"Arabic - PC"*
input source rather than the plain *"Arabic"* one.

Both tables cover every key: letters, shifted diacritics (َ ً ُ ٌ ِ ٍ ْ ّ),
Arabic punctuation (، ؛ ؟ ـ ٫ ٬ ٪), the lam-alef ligatures on Windows
(لا لأ لإ لآ), and the mirrored brackets and Arabic-Indic digits on macOS.

The macOS table wasn't transcribed by hand — it was extracted from macOS's own
Text Input Sources via `UCKeyTranslate` and matches the system layout on all 94
keys. The Windows table cross-checks against macOS's "Arabic - PC" layout on
all 36 letters.

## How it works

Raycast can read the frontmost app's *selection*, but there's no API for
reading a focused text field outright. So when nothing is selected, the
extension sends a Select All (⌘A on macOS, Ctrl+A on Windows) and reads that
instead, then pastes the fixed text back over it.

Two consequences worth knowing:

- **macOS needs Accessibility permission** for Raycast, since the Select All is
  a synthetic keystroke. Raycast will prompt the first time; if the whole-field
  path silently does nothing, check System Settings → Privacy & Security →
  Accessibility.
- **If focus isn't in a text field**, Select All grabs whatever else is
  selectable — the entire page in a browser, every file in Finder. The
  extension refuses anything over 5,000 characters and collapses the selection
  it made, rather than rewriting your window. Select the text explicitly if you
  genuinely need to fix something that long.

Replacement goes through `Clipboard.paste`. Raycast restores the previous
clipboard afterwards, so whatever you had copied survives a run — verified by
holding a sentinel string across both the selection and whole-field paths.

The conversion itself is a lookup table built on first use — the only real cost
in a run is the process spawn for the Select All, and that's skipped entirely
when you already have text selected.

## Known ambiguities

Two physical keys sometimes produce the same Arabic character, and the text
doesn't record which one you pressed. Where that happens, Layout Fixer picks
the reading that's commoner in English:

- **Windows:** `لا` is either the single `b` key or `g` then `h`. It picks `b`,
  so a word containing `gh` won't survive a there-and-back round trip.
- **macOS:** `ـ` (tatweel) is either `` ` `` or `_`. It picks `_`.

Neither affects the direction you actually care about — Latin → Arabic is
unambiguous both ways.

## Development

```bash
npm install
npm run dev
```

`npm run lint` runs ESLint and Prettier; `npm run build` produces a
distribution build. The layout tables in [`src/layouts.ts`](src/layouts.ts) are
marked `// prettier-ignore` so they stay laid out like a keyboard.

The icon is generated, not checked in by hand:

```bash
python3 tools/make_icon.py
```

## Layout

```
src/
  fix-layout.ts   the command: read selection → fix → paste
  keystrokes.ts   cross-platform Select All / collapse selection
  layouts.ts      both layout tables + convert/detect
tools/
  make_icon.py    regenerates assets/extension-icon.png
```

There's also a [Chrome extension version](https://github.com/ramysami/Layout-fixer)
that does the same thing in the browser.
