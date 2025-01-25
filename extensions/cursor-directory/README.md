# Cursor Directory

Your [cursor.directory](https://cursor.directory/) in Raycast.

[![raycast-cross-extension-badge]][raycast-cross-extension-link]

## Overview

Cursor Directory is a powerful Raycast extension that seamlessly integrates with [cursor.directory](https://cursor.directory/), allowing users to access, search, and utilize cursor rules directly within the Cursor Code Editor. This extension streamlines the process of finding and implementing cursor rules, enhancing productivity for developers using the Cursor IDE.

## Features

- **Fuzzy Search**: Quickly find cursor rules based on their titles.
- **Detailed View**: Examine cursor rules, including author information and full rule content.
- **One-Click Application**: Easily copy and create cursor rules to your project's `.cursor/rules` folder for Cursor v0.45 or `.cursorrules` for Cursor below v0.45.
- **Starring System**: Save up to 10 favorite cursor rules for quick access.
- **Local Modification**: Export and edit cursor rules as Markdown files within Cursor.
- **YouTube Videos**: Access curated Cursor-related YouTube videos directly from the extension.

## Installation

1. Ensure you have [Raycast](https://www.raycast.com/) installed on your system.
2. Install the Cursor Directory extension through the [Raycast store](https://www.raycast.com/escwxyz/cursor-directory) or Raycast's store command.

## Usage Guide

1. **Launching the Extension**:

   - Open Raycast and type `cursor directory` to use the commands.

2. **Searching for Cursor Rules**:

   - Use the fuzzy search functionality to find rules based on their titles.

3. **Toggle Detailed View**:

   - Press `Cmd + D` to toggle the detailed view of a rule.

4. **Copy and Apply Cursor Rules**:

   - Press `Cmd + Shift + C` to copy the rule content to your clipboard.
   - You can then choose to open recent projects to apply the rule directly, or press `Esc` to manually apply the rule to where you want.
   - If you have configured the default `Projects Directory`, you will be using the builtin `projects` command to open projects, otherwise you will be prompted to select recent projects via `degouville/cursor-recent-projects` extension, which is also optional.

5. **Starring Rules**:

   - Star up to 10 cursor rules for quick access in future sessions via `Cmd + Shift + P`.

6. **Local Modification**:

   - Press `Cmd + E` to open the cursor rule as a Markdown file in Cursor for editing.

7. **YouTube Videos**:
   - Access curated Cursor-related YouTube videos directly from the extension.

## Configuration

Access the extension preferences through the Action Panel or Raycast preferences to customize your experience:

- Cache Duration: Cursor rule data is cached locally for 1 day by default.
- Show Detailed View: Toggle the display of detailed view in cursor rules list.
- Default Cursor Rules List: Choose to show all cursor rules or only popular ones in cursor rules list at launch.
- Export Directory: Set the directory to export cursor rules locally.
- Skip Confirmation on Copy: Skip confirmation on copying a cursor rule.
- Replace on Launch: Configure if replace or append rule content in launch context.
- Projects Directory: Set the directory to store your projects.

[raycast-cross-extension-badge]: https://shields.io/badge/Raycast-Cross--Extension-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square
[raycast-cross-extension-link]: https://github.com/LitoMore/raycast-cross-extension-conventions
