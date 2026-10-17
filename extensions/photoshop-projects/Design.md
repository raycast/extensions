# Design System & UI Guidelines (Design)

## Visual Identity & Color Palette

The design aesthetic bridges **macOS Native Raycast Guidelines** and **Adobe Photoshop Creative Suite Identity**:

| Token Name | Hex Code | Purpose |
|------------|----------|---------|
| **Photoshop Accent** | `#31A8FF` | Primary action highlights, active filters, icons |
| **Photoshop Dark** | `#001E36` | Background tint for card backdrops |
| **Photoshop Border** | `#004880` | Card borders and divider accents |
| **Warning/Scratch** | `#FFA116` | Cache warning and memory indicators |
| **Success Emerald** | `#20C997` | Cache freed / Document created confirmations |

---

## Typography & Rhythm
- High-level filenames are styled prominently without the `.psd` suffix for clarity, with the extension displayed in a subtle secondary accessory badge.
- Parent directory paths are rendered in muted secondary text (e.g., `Design/Client Projects`).
- Relative dates use human-friendly formatting (e.g., `"2 hours ago"`, `"Yesterday"`, `"Aug 15"`).

---

## View Layouts

### 1. Grid View (Default)
- **Aspect Ratio**: Square card representation (`Grid.Item`).
- **Card Content**:
  - Full-fidelity rendered PNG thumbnail generated directly from the PSD document.
  - Subtitle displays the parent directory name and relative time.
  - Clear selection outline honoring Raycast keyboard focus.
- **Quick Look Integration**:
  - Hitting `⌘Y` renders the full-bleed artwork in macOS Quick Look.

### 2. List View (Detailed Inspection)
- **Compact List Item**:
  - 40x40 rendered image preview icon.
  - Primary title with filename.
  - Subtitle displaying relative directory path.
  - Accessories displaying formatted size (e.g., `4.2 MB`) and time badge.
- **Detail Pane (`List.Item.Detail`)**:
  - Hero image: Large rendered artwork preview.
  - Metadata sidebar:
    - **Dimensions**: `width × height px`
    - **Color Space**: `RGB / CMYK / Grayscale`
    - **Resolution**: `300 DPI`
    - **File Size**: `Megabytes / Kilobytes`
    - **Path**: Full POSIX path
    - **Layers**: Up to 10 detected layers extracted from Spotlight metadata

---

## Feedback & Empty States
- **Loading State**: Subtle animated spinner while initial recents or spotlight results are gathered.
- **Empty Recents**:
  - Title: *"No Recent Photoshop Projects Found"*
  - Description: *"Open a PSD or PSB file in Adobe Photoshop, or use the 'Search Projects' command to locate files on your Mac."*
  - Action: Button to open Search Projects or create a new document.
- **Empty Search**:
  - Title: *"No Photoshop Files Found"*
  - Description: *"No documents matching your query were found. Try searching by layer name or folder."*
