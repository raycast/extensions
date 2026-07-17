# Better Aliases

Better Aliases is an opinionated aliases and randomized snippets. Raycast in Raycast.

## Features

- **Auto-trigger aliases**: When you type the alias, the expand alias command will automatically open url, application, or insert snippet.
- **Batch Opening**: Open all filtered aliases simultaneously with `Opt + Shift + Enter`, or use `Opt + Shift + [1-9]` to open a specific number of items. (They will be opened in reverse order.)
- **Usage Statistics**: Track how often you use each alias. View your most used aliases, total usage counts, and sort by frequency or name using the **View Alias Usage Statistics** command.
- **Randomized snippets**: Create text snippets with support for randomized variations. For example, you can create a snippet for "Hello!", "Hi!", "Hey!", and when you type the alias, it will insert a random variation automatically.
- **Everything is a snippet**: You can use a prefix to trigger snippet mode for any alias. For example, you can type `rw` to open [https://raycastweekly.com/](https://raycastweekly.com/), or type `,rw` To insert the link to the currently open application.
- **Frecency sorting**: The search command will use frecency sorting to show the most used aliases and snippets first.
- **Leader key compatibility**: If you've used [Leader Key](https://github.com/mikker/LeaderKey), the extension will automatically convert your Leader Key configuration to a format that can be used with Better Aliases.
- **Export to Raycast**: Export all your aliases (including Leader Key ones) as Raycast Snippets or Quicklinks for use in Raycast natively.
- **Aliases Cheatsheet**: Visualize your aliases in two formats: an interactive **Keyboard Layout View** (locked to brand-dark theme) to see your prefix keys at a glance, and a hierarchical **Tree View** for recursive navigation.

## Configuration

This extension allows for deep customization via Extension Preferences:

- **Snippet Prefix**: You can use a prefix to trigger snippet mode (Default: `,`).
- **Randomized Separator**: Separator used for randomized snippet values (Default: `;;`).
- **Config Paths**:
- **Better Aliases Config**: Path to your aliases and snippets configuration. Defaults to Raycast's extension support folder (`{supportPath}/config.json`). Leave empty to use default location.
- **Leader Key Config**: Path to your leader key configuration file (external integration, defaults to `~/Library/Application Support/Leader Key/config.json`).

### Config File Locations

By default, config files are stored in Raycast's extension support directory for better portability and management:

- **Better Aliases**: `{supportPath}/config.json`
- **Usage Stats**: `{supportPath}/usage-stats.json`

### Finding Your Config File

Need to manually edit or back up your config? Use the **Open Config Folder** command to instantly open the folder containing your configuration file in Finder.

### Custom Config Paths

Advanced users can override default locations by setting custom paths in Extension Preferences. This is useful if you want to:
- Share configs across multiple machines via cloud storage
- Keep configs in a specific version-controlled directory
- Use a custom configuration management setup

## Exporting Aliases

You can export your aliases to standard Raycast formats using the following commands:

- **Export Better Aliases as Raycast Snippets**: Generates a JSON file compatible with Raycast's "Import Snippets" command. All aliases are included, and keywords are generated using your configured **Snippet Prefix** (e.g., `,gh` for alias `gh`).
- **Export Better Aliases as Raycast Quicklinks**: Generates a JSON file compatible with Raycast's "Import Quicklinks" command. Values are exported as-is.

Both commands include aliases from both your local Better Aliases configuration and your **Leader Key** configuration.

## Roadmap

_Want this feature or want to contribute? Let's chat!_

- [ ] Import of Raycast snippets with alias auto-generation
- [ ] Import of Raycast quicklinks with alias auto-generation
