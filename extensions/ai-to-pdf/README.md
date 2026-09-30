# AI to PDF

Convert Adobe Illustrator `.ai` files to print-ready PDF straight from Raycast — with or without bleed.

The extension does not parse the `.ai` file itself. It drives Illustrator's own **Save as PDF**, so the result is exactly what you would get from the export dialog: your PDF preset, real bleed, correct colour management, fonts and transparency.

## Commands

| Command                                         | What it does                                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Convert AI to PDF**                           | Form with a file picker (pre-filled from the Finder selection), the bleed choice, your PDF presets and an output folder.        |
| **Convert Finder Selection with Its Own Bleed** | Converts the `.ai` files selected in Finder, each with the bleed its own document defines. Assign a hotkey for one-key exports. |
| **Convert Finder Selection with Custom Bleed**  | Same, using the custom bleed from the preferences.                                                                              |
| **Convert Finder Selection Without Bleed**      | Same, at trim size.                                                                                                             |

## Bleed

Every command offers the same three choices, and nothing else:

- **From the file** _(default)_ — reads the bleed the `.ai` document itself defines and exports with exactly that. Convert a folder of mixed files in one go and each PDF gets its own document's bleed.
- **Custom** — a bleed you type in millimetres. The preferences hold the default value.
- **Off** — exports at trim size, no bleed at all.

Illustrator does not expose a document's bleed to scripting, so it is read straight out of the `.ai` file: a PDF-compatible `.ai` records the artboard as its TrimBox and the bleed area as its BleedBox, and the gap between the two is the document bleed. Files saved without PDF compatibility cannot be read this way; **From the file** then stops with a message instead of guessing, and Custom or Off still work.

Artwork still has to run past the artboard edge. Illustrator can only expose bleed that is already drawn; nothing invents artwork that isn't there.

### Getting the bleed exactly right

Illustrator truncates a bleed handed to it by a script to whole points. A document's 3 mm is 8.504 pt, which would export as 8 pt — 2.82 mm, less than asked and enough to fail a printer's 3 mm preflight check. Scripted bleeds are therefore rounded **up** to the next whole point, so 3 mm exports as 9 pt / 3.2 mm. The extra fraction sits at the outer bleed edge and is cut away; a shortfall is not recoverable.

There is one route to a bleed that is exact to the fraction: a PDF preset saved with **Use Document Bleed Settings**. Illustrator then reads the bleed from the document itself and writes it out unrounded. Combined with **From the file**, such a preset reproduces the document's bleed precisely — a 3 mm document exports with a TrimBox at 8.50394 pt, exactly 3.000 mm.

So if the bleed has to land on the millimetre, pick a preset with that option enabled and set the bleed to **From the file**. Those presets are marked _document bleed only_ in the preset list, because they always use the document's bleed: combined with **Custom** or **Off** they would silently ignore what you asked, so those combinations are refused with an explanation.

The bleed shown in the bleed menu is the one the document defines, not the rounded export value, and the result screen reports the bleed the PDF actually ended up with.

## Requirements

- macOS with Adobe Illustrator installed (tested with Illustrator 2026 / 30.7).
- The first run asks permission to control Illustrator. Allow it under **System Settings › Privacy & Security › Automation › Raycast › Adobe Illustrator**.

Illustrator is launched automatically if it isn't running; the first conversion then takes a little longer. It is brought to the front when a conversion starts, so it is already in view while it works and any dialog it raises — a missing font, a profile mismatch — is visible straight away instead of waiting unseen behind another window.

## Preferences

| Preference                  | Default           | Notes                                                                                           |
| --------------------------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| Default bleed               | From the file     | Which of the three choices the commands start with.                                             |
| Custom bleed                | `3`               | Millimetres used by the Custom choice. A comma decimal (`2,5`) works too.                       |
| Default PDF preset          | `[PDF/X-4:2008]`  | Any Illustrator PDF preset, including your own. Leave empty for Illustrator's current settings. |
| Suffix with / without bleed | `_bleed` / none   | Appended to the file name, e.g. `Flyer_bleed.pdf`.                                              |
| Output folder               | next to the `.ai` |                                                                                                 |
| Existing files              | number them       | Off by default, so nothing is silently overwritten.                                             |
| Timeout per file            | `180` s           | Raise it for very heavy documents.                                                              |

## Behaviour worth knowing

- **No printer's marks, ever.** Trim marks, registration marks, colour bars and page information are switched off explicitly after the preset is applied, so a preset that has them enabled cannot slip them into the PDF.
- The original `.ai` file is never modified.
- A file already open in Illustrator is never touched: a working copy is made next to it, converted, and removed again, so your document keeps its window, selection and undo history. Because the copy comes from disk, unsaved edits are not in the PDF — Illustrator gives no reliable way to detect those, since a document counts as modified after nothing more than a selection.
- Every PDF is measured after export and rejected if its bleed is not what was asked for — read from the PDF's own page boxes, or, when a setting writes none, from the sheet size against the artboard Illustrator reports. Illustrator's _current settings_ — the option that applies no preset — can carry "Use Document Bleed Settings" with no way to know beforehand, and a print file with the wrong bleed should not be handed over quietly. In the rare case where the bleed cannot be measured at all — several artboards in a file saved without PDF compatibility, exported by settings that write no page boxes — the conversion reports that instead of claiming a checked file; the PDF itself is left on disk, since nothing says it is wrong.
- A document with several artboards becomes one multi-page PDF, one page per artboard.
- Files are converted one at a time, since Illustrator runs one script at a time.

## Development

```sh
npm install
npm run dev
```

## License

MIT
