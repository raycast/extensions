# Store-listing screenshots

Premium mockup screenshots for the Raycast Store listing. These are **design mockups**, not live captures — Raycast is macOS-only and the extension runs inside Raycast itself, so we render the views here as standalone HTML files captured via `chrome --headless --screenshot`.

| File                          | What it shows                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `01-resume-tracking.png`      | View Tasks list with the **Resume Tracking (X.Xh spent)** action prominent — rewind icon (↻) badge.    |
| `02-keyboard-shortcuts.png`   | Today's Tasks action panel with all shortcuts visible: `↩`, `⌘⇧C`, `⌘E`, `⌘⌫`, `⌘R`.                    |
| `03-project-drilldown.png`    | Browse Projects drill-down into "Super Productivity" project — header card, tasks, `Cmd+[` Back nav.   |

Each PNG was rendered from the matching `*.html` source file in this folder. To regenerate after a copy/design change:

```bash
# From the project root on Windows (adjust path separators as needed):
chrome --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --window-size=1280,800 \
  --screenshot=assets/screenshots/01-resume-tracking.png \
  file:///$(cygpath -w "$(pwd)/assets/screenshots/01-resume-tracking.html")
```

When shipping to the Raycast Store via `npm run publish`, the CLI uploads these files. Replace the PNGs with **real** in-app captures from a Mac running the extension when you have them — the mockups are useful as a starting point or as fallback imagery.
