# AI Shell Smith Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Convert natural language prompts into shell commands via Raycast
- Multi-provider support: OpenAI (gpt-5.4-nano, gpt-5.4-mini), Perplexity (sonar-pro), Ollama (gpt-oss:20b-cloud, gpt-oss:120b-cloud), Raycast AI (Pro, no API key)
- Optional GPT-5 Search web grounding (OpenAI)
- Optional Context7 integration that grounds answers in up-to-date library documentation
- Optional shell-history context (off by default; secret-looking commands are never sent)
- Custom OpenAI-compatible endpoints and self-hosted Ollama support
- Alternatives: every command the AI proposes is kept, tagged macOS / Linux / Windows, ranked for your OS (or the one your prompt names) and one keystroke away (`⌘1`–`⌘3`)
- Reliable command extraction from any answer shape (schema-enforced on OpenAI)
- Risk badges (Caution / Destructive) with a confirmation before running destructive commands
- "needs X" badge when a command uses a program that isn't installed; installed options rank first
- Detail pane with the command, a one-line explanation, risk and alternatives (`⌘D` to toggle)
- Refine a command in plain words (`⌘E`)
- Persistent command history with delete shortcut
- Keyboard shortcuts: Copy (`↵`), Execute in Terminal (`⌘↵`), Execute & Copy Output (`⌘⇧E`), Refine (`⌘E`), Toggle Details (`⌘D`), Delete from History (`⌘⇧X`), Change Provider (`⌘L`)
