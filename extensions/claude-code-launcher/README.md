# Claude Code Launcher

Instantly open your favorite projects in Claude Code from Raycast.

## What it does

This extension lets you save your most-used project directories and open them in Claude Code with a single keystroke. No more navigating through terminal or finder - just hit your Raycast hotkey, type a few letters of your project name, and you're coding.

## Getting Started

1. **Install from Raycast Store** - Search for "Claude Code Launcher"
2. **Configure once** - Tell it where Claude Code is installed (usually `~/.claude/local/claude`)
3. **Add your projects** - Press `⌘N` and add directories you work with frequently
4. **Start coding faster** - Search and open any project instantly

## Key Features

### Smart Project Management
- Give projects memorable names instead of remembering paths
- Choose from 40+ icons to visually identify projects at a glance
- Projects you use most appear at the top automatically

### Lightning Fast Access
- Fuzzy search finds projects instantly as you type
- Recently opened projects bubble to the top
- One keypress to open in Claude Code

### Works Your Way
- Supports Terminal.app and Alacritty
- Respects your shell configuration
- Opens in new tab or window based on your terminal settings

## Keyboard Shortcuts

| What you want to do | Press this |
|---------------------|------------|
| Open project | `Enter` |
| Add new project | `⌘N` |
| Edit project details | `⌘E` |
| Delete project | `⌃X` |
| Copy project path | `⌘⇧C` |
| Show in Finder | `⌘⇧F` |

## Common Questions

**Where do I get Claude Code?**  
Visit [claude.ai/code](https://claude.ai/code) to download and install Claude Code.

**Can I use a different terminal?**  
Currently supports Terminal.app and Alacritty. More terminals coming soon based on user requests.

**Projects not showing up?**  
Make sure you've added them first with `⌘N`. The extension only shows directories you've explicitly saved as favorites.

**Claude Code won't open?**  
Check that the Claude binary path in preferences points to your actual Claude Code installation. Run `which claude` in terminal to find it.

## Tips

- **Name projects clearly** - Use names like "Company Website" instead of "proj-2024-web"
- **Use icons meaningfully** - 🚀 for production, 🔨 for development, 📚 for documentation
- **Clean up old projects** - Remove directories you no longer work with to keep the list focused

## Support

Having issues? Found a bug? Want to request a feature?  
Open an issue at [github.com/stephendolan/raycast-claude-code-opener](https://github.com/stephendolan/raycast-claude-code-opener)

---

Made with ❤️ by Stephen Dolan