# Clear File Metadata

A Raycast extension that removes all metadata from selected files for privacy protection.

## What It Does

Clears all embedded and system metadata from files, including:

- **EXIF Data**: Camera settings, device information, GPS location coordinates
- **Document Metadata**: PDF author, Word document properties, Office metadata, version numbers
- **Audio/Video**: ID3 tags, codec information, QuickTime metadata
- **System Metadata**: File ownership, Finder tags, extended attributes, resource forks
- **Dates**: Embedded creation/modification dates, file modification date (set to current time)
- **Other**: Thumbnails, color profiles, comments, copyright information

**Note**: File permissions, creation date (filesystem limitation), and file size are preserved for functionality.

## Prerequisites

- **macOS** or **Windows**
- **ExifTool** (automatically installed via Homebrew on macOS or Chocolatey on Windows)
- **Homebrew** (macOS) or **Chocolatey** (Windows) - if not installed, the extension will guide you through installation

## Usage

1. Select one or more files in Finder (macOS) or File Explorer (Windows)
2. Open Raycast and run "Clear Metadata"
3. Confirm the action
4. All metadata will be permanently removed

## Installation

The extension will automatically detect if ExifTool is installed. If not, it will:
- Offer to install it automatically (if Homebrew/Chocolatey is available)
- Provide installation instructions if package managers are missing
