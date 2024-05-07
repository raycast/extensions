# Find and Replace Filenames

This Raycast extension allows you to perform find and replace actions on filenames of the selected Finder files. It supports renaming files in bulk, using both standard string search and replace, as well as simple regular expressions.

## Features

- **Bulk Rename:** Quickly rename multiple files at once directly from Raycast.
- **Regular Expression Support:** Utilize simple regular expressions for more complex renaming patterns.
- **Intuitive Interface:** Seamlessly integrated into Raycast, providing a simple and intuitive user interface to perform actions.

## Installation

To install the Find and Replace Filenames extension:

1. Open Raycast and navigate to the Extension Store.
2. Search for "_Find and Replace Filenames_" using the search bar.
3. Select the extension from the search results and "Install" it.

## Usage

To use the extension:

1. Select the files in Finder that you want to rename.
2. Open Raycast and search for the "_Rename Selected Files_" command.
3. Enter your search pattern and the replacement string. _If you're using regular expressions, ensure your pattern is valid_.
4. Preview the new filenames and confirm to apply the changes.

### Examples

- **Simple Replacement:**

  - Search: `IMG`
  - Replace: `Image`
  - Result: `IMG_001.png` → `Image_001.png`

- **Using Regular Expressions:**
  - Search: `(\d{4})`
  - Replace: `Year_$1`
  - Result: `Report_2022.docx` → `Report_Year_2022.docx`

## License

This extension is released under the MIT License. See the LICENSE file in the repository for full details.
