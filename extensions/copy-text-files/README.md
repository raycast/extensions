**Read this in other languages: [English](README.md), [中文](README_zh.md).**

# Copy Text Files - Raycast Extension

**Copy Text Files** is an extension for [Raycast](https://www.raycast.com) that allows you to quickly copy the contents of all readable text files (e.g., `.txt`, `.md`, `.csv`) from a selected directory and its subdirectories to your clipboard. It automatically detects all non-binary text files and makes it easier for you to handle them.

## Features

- **Supports all readable text files**: The extension automatically identifies and handles all non-binary text files, regardless of their format (e.g., `.txt`, `.md`, `.csv`, `.log`).
- **Recursively scans subdirectories**: It supports scanning all readable text files within the selected directory and its subdirectories. **Files and folders starting with a dot (`.`) will be ignored** to ensure only the relevant files are processed.
- **Fast file content copying**: Quickly copy the content of selected files to your clipboard using Raycast, saving you time and effort.
- **Compatible with various text encodings**: The extension can handle most common text encodings, ensuring the contents are copied correctly.
- **Perfect for AI queries**: If you need to provide an entire project’s code or text content to an AI (such as ChatGPT) for analysis, debugging, or questioning, **this extension allows you to quickly copy the entire project’s code** to your clipboard for efficient and streamlined interaction.

## System Requirements

- [Raycast](https://www.raycast.com) installed and running.
- Any readable text file (e.g., `.txt`, `.md`, `.csv`, `.log`, etc.), excluding binary files like images or audio.

## Installation

1. Open Raycast.
2. Go to the **Extensions** page.
3. Search for and install the **Copy Text Files** extension.
4. After installation, you can access and use the extension from within Raycast.

## How to Use

1. Open Raycast.
2. Search for and select the **Copy Text Files** extension.
3. Choose the directory you want to scan for text files (it will recursively scan subdirectories).
4. The extension will automatically scan the selected directory and its subdirectories for all readable text files.
5. Select the file(s) you wish to copy.
6. Once selected, the content of the file(s) will be automatically **copied to your clipboard**, ready for pasting wherever you need it.

### Examples:

- **Copy content from a single file**: Select a file in the current directory, and Raycast will copy its contents to your clipboard.
  
- **Recursively scan and copy files from subdirectories**: The extension will scan and list all readable text files in the current directory and its subdirectories, allowing you to select the files you want and copy their contents.

- **Support for various text file formats**: The extension supports multiple text formats. Whether it's `.txt`, `.md`, or `.csv`, it will detect and copy the contents of any readable text file.

- **Copy complete project code for AI queries**: If you need to provide the entire codebase of a project to an AI for analysis, debugging, or asking specific questions, this extension makes it easy to **copy the entire project’s code**. You can quickly copy the project files’ contents to your clipboard and paste them into the AI prompt for more efficient interaction.

## Configuration

No additional configuration is required. After installing and enabling the extension, you can start using it to **copy text file contents** right away.

## FAQ & Troubleshooting

- **No text files found**:
  - Ensure you've selected the correct directory, and that it contains readable text files in the directory or its subdirectories.
  
- **Cannot copy file contents**:
  - Make sure Raycast is running correctly, and no other plugins or apps are interfering with clipboard operations.
  
- **The extension only detects some files**:
  - The extension only processes readable text files (non-binary files). If some files are not recognized as text files, they may contain binary content or special characters.

If you encounter other issues, you can report them on the [Issues](https://github.com/netcookies/copy-text-files/issues) page of the GitHub repository.

## Contributing

Contributions are welcome! If you'd like to contribute, please fork the repository and submit a pull request.

1. Clone the repository:
   ```bash
   git clone https://github.com/netcookies/copy-text-files.git
   ```
2. Make your changes and submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

---

### Code Overview

This extension works by using Raycast to allow users to select a directory, scanning all readable text files (excluding binary files) within it. It detects various text file formats, extracts their contents, and copies them to the clipboard. The extension is particularly useful for users who need to quickly **copy an entire project’s code** for AI queries, helping save time when interacting with AI for code analysis, debugging, or question-answering.

For the Chinese version of this README, please visit [here](link_to_chinese_version).
