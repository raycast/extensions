# Contributing to Claude Code Launcher

Thanks for your interest in contributing! This guide will help you get started.

## Contributing to the Published Extension

If you want to contribute to the published Raycast extension:

1. **Fork the Extension**
   - Use Raycast's "Fork Extension" action in the root search
   - Or fork from [github.com/raycast/extensions](https://github.com/raycast/extensions)
   - Find the extension at `extensions/claude-code-launcher`

2. **Follow Raycast Guidelines**
   - Read the [contribution guide](https://developers.raycast.com/basics/contribute-to-an-extension)
   - Follow the [extension guidelines](https://developers.raycast.com/basics/guidelines)

## Local Development Setup

```bash
# After forking via Raycast or cloning the extensions repo
cd path/to/claude-code-launcher

# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Build the extension
npm run build

# Run linter and fix issues
npm run fix-lint
```

## Adding Terminal Support

The extension uses an adapter pattern to support different terminals. Here's how to add a new one:

### 1. Create Your Adapter

Create a new file in `src/terminal-adapters/adapters/` (e.g., `iterm2.ts`):

```typescript
import { TerminalAdapter } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ITerm2Adapter implements TerminalAdapter {
  name = "iTerm2";
  bundleId = "com.googlecode.iterm2";
  
  async open(directory: string, claudeBinary: string): Promise<void> {
    const escapedDir = directory.replace(/'/g, "'\\''");
    const escapedBinary = claudeBinary.replace(/'/g, "'\\''");
    
    // Example implementation using AppleScript:
    const script = `
      tell application "iTerm2"
        create window with default profile
        tell current session of current window
          write text "cd '${escapedDir}' && '${escapedBinary}'"
        end tell
      end tell
    `;
    
    await execAsync(`osascript -e "${script.replace(/\n/g, "' -e '")}"`);
  }
}
```

**Finding the Bundle ID:**
```bash
osascript -e 'id of app "YourTerminalName"'
```

### 2. Register Your Adapter

Add your adapter to the registry in `src/terminal-adapters/registry.ts`:

```typescript
import { ITerm2Adapter } from "./adapters/iterm2";

const adapters: Record<string, TerminalAdapter> = {
  Terminal: new TerminalAppAdapter(),
  Alacritty: new AlacrittyAdapter(),
  iTerm2: new ITerm2Adapter(), // Add this line
};
```

### 3. Update TypeScript Types

In `src/open-claude-code.tsx`, update the Preferences interface:

```typescript
interface Preferences {
  claudeBinaryPath: string;
  terminalApp: "Terminal" | "Alacritty" | "iTerm2"; // Add your terminal
}
```

### 4. Add to User Preferences

In `package.json`, add your terminal to the dropdown options:

```json
{
  "name": "terminalApp",
  "type": "dropdown",
  "data": [
    { "title": "Terminal", "value": "Terminal" },
    { "title": "Alacritty", "value": "Alacritty" },
    { "title": "iTerm2", "value": "iTerm2" } // Add this
  ]
}
```

### 5. Test Your Implementation

1. Run `npm run dev` to test in development mode
2. Try opening different directories
3. Test edge cases:
   - Paths with spaces
   - Paths with special characters
   - Non-existent directories
   - When terminal is already open vs closed

### 6. Submit a Pull Request

1. Fork the repository
2. Create a feature branch: `git checkout -b add-iterm2-support`
3. Commit your changes: `git commit -m "Add iTerm2 terminal adapter"`
4. Push to your fork: `git push origin add-iterm2-support`
5. Open a pull request with:
   - Description of the terminal you're adding
   - Any special requirements or limitations
   - Screenshots showing it working

## Code Style Guidelines

- Use TypeScript strict mode
- Follow the existing code patterns
- Keep functions small and focused
- Use descriptive variable names
- Add types for all parameters and return values

## Testing Checklist

Before submitting a PR, ensure:

- [ ] Extension builds without errors: `npm run build`
- [ ] Linter passes: `npm run lint`
- [ ] Terminal opens correctly in all scenarios
- [ ] Error handling works (invalid paths, missing binary)
- [ ] Code follows existing patterns

## Common Terminal Implementation Patterns

### AppleScript-based Terminals (macOS)
Most macOS terminals support AppleScript. See `TerminalAppAdapter` for an example.

### Command-line Argument Terminals
Some terminals accept commands via CLI args. See `AlacrittyAdapter` for an example.

### Things to Consider

1. **Shell Detection**: Use `process.env.SHELL` to respect user's shell preference
2. **Path Escaping**: Always escape paths properly with `.replace(/'/g, "'\\''")` for shell safety
3. **Cleanup**: Remove temporary files if your implementation creates any (see TerminalAppAdapter for example)
4. **Error Messages**: Provide clear error messages for common failures

