# Magpie for Raycast

[Magpie](https://usemagpie.ai) is a menu-bar app that keeps one model catalog for the coding agents on your machine. Codex, Claude Code, Gemini CLI, OpenCode, and the rest each point at a model you pick, and their requests go through a local gateway.

This extension is a Raycast front end for the `magpie` CLI. It switches an agent's model, applies a saved profile, and shows usage, recent sessions, and subscription quota.

Requires Raycast 2.0 or later, and a magpie install. The **Magpie CLI Path** preference defaults to `~/.local/bin/magpie`. A leading `~`, and `$HOME` / `${HOME}`, expand to the home directory. The path is not passed through a shell.

Commands:

- **Switch Agent Model** lists installed agents and sets one model's id.
- **Use Profile** lists profiles and applies one. Create profiles in the terminal with `magpie save <name>`.
- **Show Usage** shows token usage for today, 7 days, 30 days, or all time, including the busiest sessions in that report.
- **Show Subscription Quotas** shows allowance windows from `magpie accounts --json` and provider key balances from `magpie quota --json`.
- **Show Recent Sessions** lists sessions from `magpie sessions --json`, with token totals and a resume command to copy.

```sh
npm install
npm test
npm run dev
```

`npm run dev` loads the extension into the running Raycast app. Root-search icons are registered when that process starts, so restart it after changing `assets/magpie.png`. Stop the process and the commands disappear. `npm test` covers path expansion and CLI output parsing, including the text and JSON shapes from magpie 0.1.408. When magpie is installed, the same tests also run read-only against that binary.

[中文说明](README.zh-CN.md)
