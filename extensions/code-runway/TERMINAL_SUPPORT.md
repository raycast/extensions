# Multi-Terminal Support

## Overview

Code Runway supports multiple terminal applications, including **Warp**, **Ghostty**, and **iTerm**. When creating a template, you can choose which terminal it should use and configure launch behavior based on that terminal's capabilities.

## Supported Terminals

### 1. Warp

**Full support**

- Supports split-pane layouts
- Supports multiple tabs
- Supports multiple windows
- Supports custom split directions
- Supports per-pane working directories
- Supports running multiple commands at launch

**Best for**: complex development environments such as full-stack apps, microservices, and multi-process workflows.

### 2. Ghostty

**Core support**

- Supports opening the correct working directory
- Supports split panes through native Ghostty AppleScript
- Supports launching in the current tab, a new tab, or a new window
- Supports optional command auto-run through native Ghostty AppleScript
- May require macOS Automation permission the first time Raycast controls Ghostty

**Best for**: users who prefer Ghostty and want a lightweight but scriptable project launcher.

### 3. iTerm

**Basic support**

- Supports opening a target working directory
- Supports running combined command chains
- Uses the iTerm URL scheme first, with AppleScript fallback
- Does not control whether launches open in a split, tab, or separate window

**Best for**: users who already work primarily in iTerm and want command-driven project startup.

## How to Use It

### Create a Template

1. Open the **Launch Templates** command.
2. Choose **Create New Template**.
3. Fill in the core fields:
   - **Template Name**
   - **Description**
   - **Terminal**
4. Configure launch behavior based on the selected terminal.

### Warp Configuration

- Choose a split direction
- Choose a launch mode:
  - Split Panes
  - Multiple Tabs
  - Multiple Windows
- Add one or more commands with optional working directories

### Ghostty Configuration

- Optionally enable **Auto-Run Commands**
- Set working directories relative to the project root
- Choose whether the layout should start in the current tab, a new tab, or a new window
- Commands can be left blank if you only want to create panes or tabs

### iTerm Configuration

- Add one or more commands
- Set working directories relative to the project root
- The extension will try the iTerm URL scheme first and fall back to AppleScript if needed

## Launching a Project

1. Open the **Search Projects** command.
2. Search for the project you want.
3. Launch it with:
   - The default template
   - Simple Launch
   - A specific terminal template

The extension automatically detects which terminals are installed and shows the appropriate actions.

## Example Templates

### Warp Full-Stack Template

```text
Name: Full-Stack Development
Terminal: Warp
Split Direction: Left / Right
Launch Mode: Split Panes

Command 1
Title: Frontend Dev Server
Command: npm run dev
Working Directory: frontend

Command 2
Title: Backend API Server
Command: npm run start:dev
Working Directory: backend

Command 3
Title: Logs
Command: npm run logs
Working Directory:
```

### Ghostty Simple Template

```text
Name: Development
Terminal: Ghostty
Command: npm run dev
Working Directory:

Note: If you add multiple commands, Ghostty creates panes in the current tab, a new tab, or a new window depending on the selected launch mode. Whether commands run automatically depends on the Auto-Run setting.
```

## Data Migration

If you created templates before multi-terminal support was added:

- Existing templates default to **Warp**
- Existing configuration remains intact
- No manual migration is required

## Terminal Detection

The extension checks installed terminals on startup:

- Warp installed
- Ghostty installed
- iTerm installed
- If none are installed, launch actions are disabled and an error toast is shown

You can also run the built-in diagnostic actions from the project list to inspect terminal availability and integration details.

## Ghostty Implementation Details

Ghostty launches through native AppleScript:

```applescript
tell application "Ghostty"
  set cfg to new surface configuration
  set initial working directory of cfg to "/path/to/project"
  set win to new window with configuration cfg
end tell
```

### Ghostty Limitations

The current Ghostty integration still has a few boundaries:

1. It is macOS-only because AppleScript is macOS-only.
2. macOS may ask you to allow Raycast to control Ghostty.
3. Reusing the current tab may still require an explicit `cd` into the target project directory.

## Future Improvements

- Better Ghostty window orchestration
- Cleaner template abstractions across all terminals
- Stronger validation for terminal-specific template options
- More diagnostics for permission and integration failures

## Core APIs

```typescript
await checkGhosttyInstalled(): Promise<boolean>
await checkWarpInstalled(): Promise<boolean>
await checkItermInstalled(): Promise<boolean>

await launchGhosttyProject(project: Project, template: WarpTemplate)
await launchWarpConfig(project: Project, template: WarpTemplate)
await launchItermProject(project: Project, template: WarpTemplate)

await launchGhosttySimple(project: Project)
await launchProjectSimple(project: Project)
await launchItermSimple(project: Project)
```
