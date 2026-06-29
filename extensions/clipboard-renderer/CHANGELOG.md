# Clipboard Renderer Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Render from the clipboard, auto-detecting whether it holds Mermaid code or a LaTeX math expression
- Render LaTeX math locally using Raycast's built-in LaTeX support (offline, nothing leaves your machine)
- Render Mermaid diagrams locally with mmdc (@mermaid-js/mermaid-cli) when it's auto-detected on your PATH, otherwise via mermaid.ink (with a warning when the web service is used)
- Copy the rendered image, open the diagram in the Mermaid Live Editor, or copy the image URL / source
- Diagram theme preference: Auto (match Raycast appearance), Default, Dark, Neutral, Forest
- Optional Local Mermaid CLI preference to point at an mmdc binary when auto-detection fails
