# IFEX EXIF Viewer

A Raycast extension that displays EXIF metadata from image files using the ifex CLI tool.

## Features

- View EXIF data from selected files in Finder
- Support for drag-and-drop files into Raycast
- Beautiful table display of metadata
- Support for multiple file formats
- Error handling for unsupported files

## Requirements

- [ifex CLI tool](https://github.com/danielfilho/ifex) must be installed and available in PATH

## Installation

1. Install the ifex CLI tool
2. Install this Raycast extension
3. Select image files in Finder and run the "View EXIF Data" command

## Usage

1. Select one or more image files in Finder
2. Open Raycast and search for "View EXIF Data"
3. View the EXIF metadata in a clean, organized format

## Development

```bash
pnpm install
pnpm run dev
```