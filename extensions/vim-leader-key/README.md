# Leader Key for Raycast

A Vim-style leader key extension for Raycast that enables quick navigation through hierarchical menus using single keystrokes. Organize your apps, commands, and shortcuts into logical groups for lightning-fast access.

## Features

### 🗂️ Hierarchical Organization

- **Nested Groups**: Create folders to organize related actions
- **Single-Key Navigation**: Navigate with individual keystrokes (no chord combinations)
- **Breadcrumb Navigation**: Visual indication of your current location
- **Auto-Reset**: Configurable timeout to return to root menu

### 🚀 Action Types

- **Applications**: Launch apps with file-based or name-based targeting
- **URLs**: Open websites or Raycast deeplinks
- **Folders**: Open directories in file manager
- **Commands**: Execute shell commands

### 🌐 Browser Selection

- **Group-level default**: Set a default browser for all URLs in a group
- **Per-URL override**: Override the group default on individual URL actions
- **System default fallback**: Uses your OS default browser when no preference is set
- Resolution order: action browser > parent group browser > system default

### ⚙️ Configuration Management

- **Import/Export**: Share configurations via JSON files
- **Legacy Migration**: Automatic upgrade from flat key sequences
- **Conflict Detection**: Prevents duplicate keys within groups
- **Visual Editor**: Intuitive forms for adding and editing items

### 🎯 Smart UI/UX

- **Type-based Grouping**: Items organized by type for easy scanning
- **Dynamic Icons**: App-specific icons and contextual indicators
- **Real-time Search**: Type to navigate, with context-aware hints
- **Comprehensive Actions**: Edit, delete, add, and navigate with keyboard shortcuts

## Quick Start

1. Install the extension in Raycast
2. Run `Leader Key` command
3. Press any key to see available actions
4. Use `⌘N` to add new actions or `⌘⇧N` to add groups

## Default Configuration

The extension comes with a platform-aware starter config:

```
a → Applications/
  ├── b → Browser (Safari / Edge)
  ├── t → Terminal (Terminal.app / Command Prompt)
  ├── f → File Manager (Finder / Explorer)
  ├── c → Calculator
  └── n → Notes (Notes.app / Notepad)
u → URLs/
  ├── g → Google
  └── h → GitHub
```

## Usage Examples

### Simple Actions

- Press `a` then `b` to open your browser
- Press `u` then `g` to open Google

### Creating Groups

1. Press `⌘⇧N` to create a new group
2. Set a key (e.g., `d` for "Dev Tools")
3. Add actions to the group using `⌘N`

### Action Types

**Applications:**

- Use app bundle paths: `/Applications/Visual Studio Code.app`
- Or simple names: `Visual Studio Code`

**URLs:**

- Websites: `https://github.com`
- Raycast deeplinks: `raycast://extensions/raycast/system/quit-all-applications`
- Optionally set a specific browser via the "Open With" dropdown

**Commands:**

- Shell scripts: `open ~/Downloads`
- Complex commands: `git status && git pull`

## Configuration

### Preferences

- **Auto-Reset Timeout**: Enable/disable automatic return to root
- **Timeout Duration**: Set timeout between 2.5-6 seconds

### Import/Export

1. **Export**: Use `Export Config` command to save your setup
2. **Import**: Use `Import Config` command to load shared configurations
3. **Share**: JSON files are compatible across installations

### JSON Format

```json
{
  "type": "group",
  "actions": [
    {
      "key": "u",
      "type": "group",
      "label": "URLs",
      "browser": "/Applications/Google Chrome.app",
      "actions": [
        {
          "key": "g",
          "type": "url",
          "label": "Google",
          "value": "https://google.com"
        },
        {
          "key": "h",
          "type": "url",
          "label": "GitHub",
          "value": "https://github.com",
          "browser": "/Applications/Firefox.app"
        }
      ]
    },
    {
      "key": "c",
      "type": "application",
      "label": "Calculator",
      "value": "/System/Applications/Calculator.app"
    }
  ]
}
```

In this example, Google opens in Chrome (group default), while GitHub opens in Firefox (per-action override).

## Keyboard Shortcuts

### Navigation

- **Any Key**: Navigate to action or group
- **Backspace**: Go back to parent group
- **Escape**: Reset to root menu

### Management

- **⌘N**: Add new action
- **⌘⇧N**: Add new group
- **⌘E**: Edit current item
- **⌘⌫**: Delete current item
- **⌘C**: Copy action value

## Migration from v1

If you used the previous version with flat key sequences, your configuration will be automatically migrated to the new hierarchical format. Multi-character sequences like `ac` become nested structures (`a` → `c`).

## Tips & Best Practices

### Organization Strategies

- **By Category**: Group similar apps (`dev/`, `media/`, `utils/`)
- **By Frequency**: Put most-used items at root level
- **By Workflow**: Create project-specific groups

### Key Selection

- Use mnemonic keys (`c` for Calculator, `t` for Terminal)
- Keep frequently used actions on single keystrokes
- Use logical groupings (`a` for Applications, `u` for URLs)

### Performance

- The extension has minimal startup time
- Nested navigation is instant
- Large configurations (100+ items) perform well

## Troubleshooting

**Actions not working?**

- Check file paths for applications
- Verify URLs are complete and valid
- Test shell commands in Terminal first

**Keys not responding?**

- Clear configuration and rebuild if migration failed
- Check for key conflicts within groups
- Ensure timeout isn't too short

**Import/Export issues?**

- Validate JSON format
- Check that all required fields are present
- Use Export to see proper format

## Inspiration & Compatibility

This Raycast extension was inspired by [mikker's Leader Key app](https://github.com/mikker/LeaderKey) for macOS. The JSON configuration format is designed to be compatible, allowing easy migration and sharing of configurations between both tools.

While this extension brings the leader key concept to Raycast with additional features like real-time navigation and Raycast-specific integrations, it maintains the same hierarchical philosophy that makes mikker's original app so effective.

## Contributing

This extension is part of the Raycast ecosystem. For issues or feature requests, please check the repository or contact the maintainer.

## License

MIT
