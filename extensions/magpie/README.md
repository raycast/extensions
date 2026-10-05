# Magpie for Raycast

[Magpie](https://usemagpie.ai) is a menu-bar app that keeps one model catalog for the coding agents on your machine. Codex, Claude Code, Gemini CLI, OpenCode, and the rest each point at a model you pick, and their requests go through a local gateway.

This extension is a Raycast front end for the `magpie` CLI. It switches an agent's model, applies a saved profile, and shows usage, recent sessions, and subscription quota.

Install Magpie from [usemagpie.ai](https://usemagpie.ai), then set **Magpie CLI Path** if the executable is not at `~/.local/bin/magpie`. A leading `~`, and `$HOME` / `${HOME}`, expand to the home directory. The path is not passed through a shell.

Commands:

- **Switch Agent Model** lists installed agents and sets one model's id.
- **Use Profile** lists profiles and applies one. Create profiles in the terminal with `magpie save <name>`.
- **Show Usage** shows token usage for today, 7 days, 30 days, or all time, including agents, models, provider keys, accounts, and the busiest sessions in that report.
- **Show Subscription Quotas** shows allowance windows from `magpie accounts --json` and provider key balances from `magpie quota --json`.
- **Show Recent Sessions** lists sessions from `magpie sessions --json`, with token totals and a resume command to copy.
