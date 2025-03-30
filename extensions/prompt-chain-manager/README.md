# Prompt Chain Manager

A Raycast extension for managing, organizing, and reusing prompt chunks for AI interactions.

## Features

- **Chunk Management**: Add, edit, remove, and reorder prompt chunks
- **Enable/Disable Chunks**: Toggle which chunks to include in your final prompt
- **Copy Functionality**: Copy the combined text of all enabled chunks
- **Template Support**: Save and reuse favorite headers
- **Preview Mode**: See how your final prompt will look before copying
- **Per-Chunk Truncation**: View large prompts with per-chunk truncation in preview

## Commands

- **Manage Prompt Chain**: View and organize your prompt chunks
- **Add Clipboard to Chain**: Add text from your clipboard as a new chunk
- **Copy Final Prompt**: Preview and copy the combined text of all enabled chunks
- **Clear Prompt Chain**: Remove all stored chunks

## Usage

1. Copy text you want to add to your prompt chain
2. Use "Add Clipboard to Chain" to add it as a chunk
3. Optionally add a header to describe the chunk
4. Repeat steps 1-3 to build your prompt
5. Use "Manage Prompt Chain" to organize chunks
6. Use "Copy Final Prompt" to copy the combined text

## Configuration

- **Include Headers in Copy**: Toggle whether to include headers in the copied text
- **Template Directory**: Specify a directory for template files

## Development

This extension is built with React and the Raycast API. It uses LocalStorage for persistence.
