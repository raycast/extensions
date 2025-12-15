# System Path File Searcher

**System Path File Searcher** is a high-performance Raycast extension that merges the speed of Spotlight with the utility of a file manager. It allows you to perform strict global searches and "drill down" into folders to browse their content directly within the Raycast interface, featuring a dynamic Split View for file metadata.

## ✨ Features

- **🚀 Strict Global Search:** Uses macOS native `mdfind` to locate files instantly. Results are filtered to match the exact search term, ensuring precision.
- **📂 Deep Navigation Mode:** Browse folder contents without opening Finder.
- **⚓️ Root Anchoring:** Lock a folder as your navigation root and filter files *only* within that specific directory.
- **🖼 Dynamic Split View:** The interface automatically switches to a detailed Split View with file metadata (Size, Created, Modified) when results are found.
- **🚫 Smart Filtering:** Automatically excludes the `Downloads` folder to keep results clean and relevant.
- **💎 Native UI:** Renders native macOS file icons and system previews via Quick Look.

## 🛠 How to Use

### 1. Global Search
Simply type the name of the file or folder you are looking for.
> **Example:** Type `example` to find files named "example".
- **Strict Matching:** Only files containing the exact search term in their name will appear.
- **Visualization:** If results are found, a panel appears on the right showing file details (Size, Modified date, path).

### 2. Navigation Mode
To browse the contents of a directory without leaving Raycast:
1.  Search for the folder you want (e.g., `example`).
2.  Select the folder in the result list.
3.  Press **`Cmd` + `Enter`**.
4.  The search bar will update (e.g., `example/`), locking you into that folder.

### 3. Browsing & Anchoring
Once inside a folder (Navigation Mode):
- **Filter:** Type to filter files inside the current root.
- **Drill Down:** Select a subfolder and press **`Cmd` + `Enter`** to make it the new Root.
- **Go Back:** Press `Backspace` on an empty search query to go up one level.
- **Quick Look:** Press `Cmd` + `Y` to preview the file content.

## ⌨️ Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `↵` (Enter) | **Open** the file/folder in default app |
| `⌘` + `↵` | **Navigate/Enter** into the folder (In-app browsing) |
| `⌘` + `⇧` + `↵` | **Show in Finder** |
| `⌘` + `Y` | **Quick Look** (Preview file) |
| `Backspace` | Go up one level (when in Navigation Mode) |

## ⚙️ Requirements & Permissions

- **Raycast**: Version 1.50.0 or higher.
- **Permissions**: This extension requires **Full Disk Access** to effectively search and list files in protected directories (like Desktop, Documents, or iCloud Drive).
    1. Go to **System Settings** -> **Privacy & Security** -> **Full Disk Access**.
    2. Ensure **Raycast** is enabled.

## 🔧 Troubleshooting

**"No Results" appears:**
- Ensure Raycast has Full Disk Access.
- The extension filters out the `Downloads` folder by default.
- The search is case-insensitive but "strict" (the filename must contain the query).

**Icons or Previews not loading:**
- The extension uses native system icons. Ensure you are on a supported macOS version.

## 📄 License

MIT License