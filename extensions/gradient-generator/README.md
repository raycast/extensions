# Gradient Generator

Create, preview and save gradients locally in Raycast. Copy CSS, Tailwind arbitrary-value classes or a complete SwiftUI view, and export PNG or SVG files.

## Commands

| Command             | What you can do                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| **Create Gradient** | Choose linear, radial or conic; enter 2–10 hex colors; set a linear angle; add an optional label.   |
| **Random Gradient** | Generate a gradient with two or three random colors, then preview, copy or save it.                 |
| **Saved Gradients** | Search your library, open previews, edit labels, copy snippets or delete entries with confirmation. |

**Example:** choose Linear, enter `#FF5733` and `#33C1FF`, set the angle to `90`, and label it “Hero background”. Choose **Preview Gradient**, then **Copy CSS** or **Save Gradient** from Actions.

Colors accept `#RGB` and `#RRGGBB`. Stops are evenly spaced; custom positions and per-stop transparency are not available. A linear angle of 0° points up, 90° right, 180° down and 270° left; 360° equals 0°.

![Random Gradient preview with local rendering, color metadata and the Random (Any) primary action](media/preview.jpg)

## Save and rename

A label entered in Create follows the gradient into Preview. **Save with Label** and **Edit Label** share the same rules:

- Blank labels are allowed; clearing a label keeps the gradient.
- Reusing a non-empty label asks before replacing other saved entries with that exact, case-sensitive label.
- Canceling replacement leaves your form and library intact.
- Saving a preview opened from the library updates that selected entry. Further saves from the same preview update it again.
- If the underlying entry changes, reopen it before editing again.

Existing gradients with more than ten stops remain readable, exportable and renameable; new gradients and added stops use the ten-stop limit.

The extension keeps the existing `saved-gradients` storage format and does not automatically migrate or delete records. If stored data is invalid, library writes stop and **Copy Original Library JSON** lets you retain the original data for recovery. There is no JSON restore command yet.

## Copy and export

| Output   | Supported behavior                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| CSS      | Linear, radial and conic; explicitly requests sRGB interpolation. Requires a browser supporting CSS gradient color-space syntax.     |
| Tailwind | Arbitrary-value `bg-[…]` class, or raw CSS according to your preference, in both Preview and Saved Gradients.                        |
| SwiftUI  | Complete `GeneratedGradient` view, including imports and numeric sRGB colors. macOS 12+ / iOS 15+; no `Color(hex:)` helper required. |
| PNG      | Opaque image, custom dimensions or presets, at 1× or 2× DPR.                                                                         |
| SVG      | Portable linear and radial vectors, with dimensions and a matching viewBox.                                                          |

**Conic SVG is deliberately unavailable:** standard SVG gradients cannot represent it. Use PNG or CSS; the extension never substitutes a radial gradient. PNG clipboard copying is not implemented; save a PNG file instead.

### Export limits

Choose an existing destination folder in extension preferences. `~/Downloads` is expanded to your home directory; a custom folder is useful for redirected or localized Downloads folders.

Enter a filename such as `hero-gradient.png`, without a path. Existing regular files require confirmation. Reserved Windows filenames, path separators and traversal are rejected on every platform. Symlink destinations are rejected.

Width and height must be positive whole numbers. The final output, **including DPR**, is limited to **8,192 pixels per side and 16,777,216 total pixels**. For example, 1920 × 1080 at 2× produces 3840 × 2160 pixels; 4K at 2× exceeds the budget. The RGBA pixel buffer alone can reach 64 MiB; encoding also needs working memory.

If rendering or writing fails, the form keeps your entries and shows the error. New exports use exclusive publication; replacements are staged before the existing file is replaced. Use a local filesystem supporting hard links and atomic renames (such as APFS or NTFS); unsupported destinations fail rather than silently overwrite files.

## Preferences

| Preference           | Default         |
| -------------------- | --------------- |
| SVG Export Directory | `~/Downloads`   |
| PNG Export Directory | `~/Downloads`   |
| Tailwind Output Mode | Utility classes |

## Privacy and platform status

Gradient creation, random generation, storage and rendering run locally, without extension network requests or AI access. Clipboard contents are read only when you choose a paste-color action. The extension does not implement cloud sync; Raycast controls its own storage and backup behavior.

Available on **macOS**.
