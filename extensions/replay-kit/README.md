# Replay Kit

Record, review, and replay your daily workflows across browsers, terminal, and applications to automate repetitive tasks.

## Features

### 🎬 **Workflow Recording**
- **Smart Monitoring**: Automatically captures browser navigation, terminal commands, and application usage
- **Tab Context Detection**: Distinguishes between same-tab navigation, new tabs, and new windows
- **Browser-Specific Tracking**: Records which browser was used (Safari, Chrome, Arc, Firefox)
- **Duplicate Prevention**: Filters out consecutive duplicate actions for cleaner recordings

### ✏️ **Review & Edit**
- **Interactive Review**: Select and delete unwanted actions before saving
- **Inline Editing**: Edit recording details directly in the review screen
- **Sensitive Data Storage**: Securely store usernames, passwords, and API tokens
- **Tagging System**: Organize recordings with custom tags

### 🔄 **Intelligent Replay**
- **Browser-Specific Replay**: Opens URLs in the same browser that was originally used
- **Auto-Launch**: Automatically opens closed browsers before replay
- **Tab Context Preservation**: Maintains original tab behavior (new tab vs same tab)
- **Fallback Support**: Uses system default browser if specific browser fails

## Commands

### Record Workflow
Start monitoring your activities across:
- **Browser Navigation**: URL visits with tab context
- **Terminal Commands**: Shell commands with directory context
- **Application Usage**: App launches and switches
- **File Operations**: File open/save/create actions

**Keyboard Shortcuts:**
- `Tab` - Start recording
- `Shift + Enter` - Stop recording
- `Cmd + Enter` - Save recording
- `Cmd + D` - Delete selected actions

### My Recordings
Browse and manage your saved workflows:
- View all recordings organized by user
- Edit recording details and descriptions
- Delete unwanted recordings
- Preview action sequences before replay

### Replay Workflow
Automate your workflows:
- Select from saved recordings
- Preview actions before execution
- Intelligent browser handling
- Progress tracking with success/failure counts

## Requirements

- macOS with AppleScript support
- Supported browsers: Safari, Chrome, Arc (Firefox has limited support)
- Terminal applications: Terminal, iTerm, Hyper, Alacritty, Kitty

## Privacy & Security

- All data is stored locally using Raycast's secure storage
- Sensitive information is handled securely
- No data is transmitted to external servers
- Browser access requires standard macOS permissions

## Use Cases

- **Daily Workflows**: Automate repetitive development setup tasks
- **Testing Procedures**: Record and replay testing sequences
- **Documentation**: Capture workflows for team sharing
- **Onboarding**: Create reproducible setup procedures
- **Productivity**: Eliminate repetitive manual tasks

## Getting Started

1. Use **Record Workflow** to start capturing your activities
2. Perform your workflow as normal
3. Stop recording and review captured actions
4. Edit, tag, and save your workflow
5. Use **Replay Workflow** to automate the task later