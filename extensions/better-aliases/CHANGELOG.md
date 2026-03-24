# Better Aliases Changelog

## [Initial Version] - 2026-01-15

- **Auto-trigger aliases**: When you type the alias, the expand alias command will automatically open url, application, or insert snippet.
- **Batch Opening**: Open all filtered aliases simultaneously with `Opt + Shift + Enter`, or use `Opt + Shift + [1-9]` to open a specific number of items. (They will be opened in reverse order.)
- **Usage Statistics**: Track how often you use each alias. View your most used aliases, total usage counts, and sort by frequency or name using the **View Alias Usage Statistics** command.
- **Randomized snippets**: Create text snippets with support for randomized variations. For example, you can create a snippet for "Hello!", "Hi!", "Hey!", and when you type the alias, it will insert a random variation automatically.
- **Everything is a snippet**: You can use a prefix to trigger snippet mode for any alias. For example, you can type `rw` to open [https://raycastweekly.com/](https://raycastweekly.com/), or type `,rw` To insert the link to the currently open application.
- **Frecency sorting**: The search command will use frecency sorting to show the most used aliases and snippets first.
- **Leader key compatibility**: If you've used [Leader Key](https://github.com/mikker/LeaderKey), the extension will automatically convert your Leader Key configuration to a format that can be used with Better Aliases.
- **Export to Raycast**: Export all your aliases (including Leader Key ones) as Raycast Snippets or Quicklinks for use in Raycast natively.