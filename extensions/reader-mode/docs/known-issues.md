# Known Issues

## Bracket Rendering

Square brackets `[text]` that appear in article content (such as editorial insertions in quotes) are automatically converted to parentheses `(text)` to prevent Raycast's markdown renderer from interpreting them as LaTeX math notation. This is a workaround for a rendering limitation and means the displayed text may differ slightly from the original source material.

## Image Rendering

Image alt text and title attributes are automatically stripped to ensure proper rendering in Raycast. Images are displayed as `![](url)` without descriptive text. This prevents rendering issues where long alt text or title attributes (especially those containing quotes) can break the markdown image syntax.

Additionally, relative image URLs (e.g., `/image.jpg`) are automatically converted to absolute URLs using the page's base URL to ensure images load properly.
