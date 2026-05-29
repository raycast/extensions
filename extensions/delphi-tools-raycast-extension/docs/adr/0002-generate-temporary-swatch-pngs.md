# Generate temporary swatch images

Commands that need colour previews should generate solid-colour SVG swatches inside the Raycast Extension instead of depending on local web preview routes, storing image bytes in Raycast storage APIs, adding an image-generation dependency, or writing raster previews by default.

Swatches are generated with Node built-ins only. A command passes a 6-digit hex colour and a command-specific namespace to the shared swatch helper. The helper normalises the hex value, creates a deterministic file path under the system temporary directory with `os.tmpdir()` and `path.join()`, creates the directory recursively, writes a small SVG, and returns the file path for Raycast markdown.

The solid-colour SVG writer emits a minimal rectangle with explicit dimensions, viewBox, role, and colour label. Default swatches are `180x96`, with optional width and height overrides for commands that need a different preview shape. Text labels, colour names, and hex values stay in Raycast markdown rather than being baked into the image.

Temporary paths are disposable and deterministic. The operating system may remove them, and commands should regenerate missing swatches rather than treating them as durable state. The namespace keeps generated files grouped per Command, for example `colorblind` and `harmony`.

We considered Raycast `LocalStorage`, Raycast `Cache`, extension support paths, PNG files, and localhost web preview URLs. `LocalStorage` and `Cache` are string-oriented and better suited to small settings or metadata, not image files that Raycast markdown needs to load by path. Extension support paths are better for durable generated assets, but these previews are disposable. PNG files work but are larger and require raster encoding for a shape SVG can represent directly. Localhost routes contradict the Raycast-native, local-first wrapper direction by requiring a separate web server. Generating temporary SVG files keeps previews local, cross-platform, dependency-free, compact, and reusable across commands.

If Raycast markdown does not render local SVG files reliably in a specific Command, that Command may fall back to temporary PNG generation for the affected preview only.
