# Agent Client Protocol

## Example setup

If you get exit code 127, try setting binary to absolute path, and try adding additional PATH configuration.

### Claude code

- Follow the official guides at https://github.com/zed-industries/claude-code-acp
- Fill in additional environment variables (`ANTHROPIC_API_KEY`)
- Add additional PATH configuration
  - For example, if you install claude code with bun, add `~/.bun/bin` to the PATH

### Gemini

- Use `--experimental-acp` as argument

