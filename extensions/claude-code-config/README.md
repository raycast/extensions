# Claude Code Config Selector

A Raycast extension for managing Claude Code API configurations. Easily switch between different Claude Code environments (DeepSeek, Kimi) with Raycast interface.

**Languages:** [English](README.md) | [中文](README.zh-CN.md)

## Features

- 🚀 **Native Raycast UI**: Full List view with ActionPanel support
- 🎯 **Visual Status Indicators**: See which configuration is currently active
- ⚡ **Quick Switching**: One-click configuration changes
- 📋 **Copy Actions**: Quickly copy URLs and model names
- 🔄 **Shell Integration**: Updates your `~/.zshrc` environment variables

## Custom Configurations

You can configure custom Claude Code configurations through the extension preferences. The extension uses a single JSON field where you can define any number of configurations:

1. Open Raycast Preferences → Extensions → Claude Code Config Selector
2. In the "Claude Code Configurations" field, enter a JSON array of configuration objects
3. Each configuration should include all required fields:

Example configuration:
```json
[
  {
    "alias": "Custom Production",
    "emoji": "⭐",
    "ANTHROPIC_BASE_URL": "https://api.example.com",
    "ANTHROPIC_AUTH_TOKEN": "your_token_here",
    "ANTHROPIC_MODEL": "claude-3-opus-20240229",
    "ANTHROPIC_SMALL_FAST_MODEL": "claude-3-haiku-20240307"
  },
  {
    "alias": "Testing",
    "emoji": "🧪",
    "ANTHROPIC_BASE_URL": "https://api.testing.example.com",
    "ANTHROPIC_AUTH_TOKEN": "your_testing_token",
    "ANTHROPIC_MODEL": "claude-3-sonnet-20240229",
    "ANTHROPIC_SMALL_FAST_MODEL": "claude-3-haiku-20240307"
  }
]
```

The extension provides sensible defaults if no custom configurations are specified.

## Usage

1. Open Raycast and search for "Claude Code Config Selector"
2. Browse the list of configurations
3. Use `↩` to select a configuration
4. Use `⌘B` to copy the Base URL
5. Use `⌘M` to copy the Model name
6. Use `⌘T` to copy the Token
7. Use `⌘S` to copy the source command
8. Use `⌘R` to reload shell (when a config is active)

## Environment Variables

The extension creates a dedicated environment file at `~/.claude-code-env` instead of modifying your shell configuration directly. This is safer and gives you more control.

### Automatic Configuration Loading (Recommended)
Add these lines to your `~/.zshrc` to automatically load the configuration when starting a new shell session:
```bash
if [[ -z "$CLAUDE_CODE_SOURCED" ]]; then
  export CLAUDE_CODE_SOURCED=1
  [ -f ~/.claude-code-apply ] && source ~/.claude-code-apply
fi
```

### Manual Usage
If you prefer manual control, you can apply configurations as needed:

```bash
source ~/.claude-code-env
```

Or use the convenience script:
```bash
source ~/.claude-code-apply
```

The environment file contains:
```bash
export ANTHROPIC_BASE_URL="https://api.anthropic.com"
export ANTHROPIC_AUTH_TOKEN="your_token_here"
export ANTHROPIC_MODEL="claude-3-opus-20240229"
export ANTHROPIC_SMALL_FAST_MODEL="claude-3-haiku-20240307"
```

## Development

To modify the extension:

1. Edit `src/utils.ts` to change configuration options
2. Edit `src/index.tsx` to modify the UI
3. Run `npm run dev` to test changes
4. Run `npm run build` to build for production

## License

MIT License - feel free to modify and distribute.
