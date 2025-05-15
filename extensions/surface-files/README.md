# Surface Files

Surface all files with a given extension from a selected folder (including subfolders) into a new sibling folder at the same level as the selected folder.

## Features

- **Copy or Move:** Surface files by copying or moving them to a new sibling folder.
- **Name Conflict Handling:** Files with the same name are renamed with `_1`, `_2`, etc.
- **Confirmation Limit:** Set a limit for batch operations to avoid accidental large moves/copies.
- **Include Hidden Files:** Option to include hidden files (dotfiles) in the extraction process.  

## Usage

1. Select a folder in Finder.
2. Run the command in Raycast.
3. Enter the file extension (e.g. `png`).
4. All matching files will be copied/moved to a new sibling folder next to the selected folder.

## Settings

- **Limit:** Set the maximum number of files to be surfaced at once. If the limit is exceeded, a confirmation dialog will appear.  
  _Note: Only positive numbers are allowed. Invalid input will fall back to the default limit (20)._
- **Include Hidden Files:** Enable to also process hidden files (files/folders starting with a dot).
- **Folder Name:** Set the base name for the new folder (e.g. `XYZ` → `XYZ_mp3`).  


## Permissions

- Needs access to the selected folder and its subfolders.
- macOS will prompt for permissions if needed.
- If you see errors about permissions, check your System Preferences under "Security & Privacy" → "Files and Folders".

## Notes

- Performance depends on the number and size of files. Very large files may take longer to process.

## Credits

Icon made by [Freepik](https://www.flaticon.com/authors/freepik) from [www.flaticon.com](https://www.flaticon.com/)

---

**Enjoy using Surface Files! If you have feedback or issues, please open an issue or contribute on GitHub.**
