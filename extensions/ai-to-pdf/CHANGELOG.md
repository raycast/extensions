# AI to PDF Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Convert `.ai` files to PDF through Illustrator's own PDF export
- Three bleed choices: read from the file, a custom size, or off
- The bleed a document defines is detected by reading the `.ai` file, which Illustrator's scripting model does not expose
- Printer's marks are always off, even when the chosen PDF preset enables them
- Bleed is rounded up to whole points, working around Illustrator truncating a scripted bleed downwards
- Presets with "Use Document Bleed Settings" export a document's bleed exactly, and are used for that in From the File mode and refused for the other two
- Pick any Illustrator PDF preset, including custom ones
- Two no-view commands that convert the current Finder selection with one hotkey
- Illustrator is brought to the front when a conversion starts
- Batch conversion, configurable output folder, filename suffixes and overwrite behaviour
