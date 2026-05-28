# Skill Curator

**Find, fix, and recall the skills you've installed for Claude Code & Codex — without leaving Raycast.**

If you use Claude Code or Codex with more than a handful of skills, you know the feeling: dozens of them scattered across user folders, plugin marketplaces, and version caches — half of them forgotten, and no idea whether any quietly broke. Then, right when you need one mid-task, you can't remember what it's called.

Curator is a command center for your skills. One keystroke to **search** them, **health-check** them, or let **AI pick** the right one for what you're doing.

## Commands

### Search Skills — _"what do I have, and what's it called?"_

Fuzzy-search every installed skill by **name, purpose, or trigger phrase**, across both Claude Code and Codex. Type _"scrape a webpage"_ and land on the right skill even if you never memorized its name.

- Preview the full `SKILL.md` in a side panel (`⌘D`)
- Copy the name (`⏎`), copy it as a `/command` (`⌘⏎`), or copy a trigger phrase (`⌘⇧T`)
- Open the skill in your editor (`⌘O`) or reveal it in Finder
- Skills shared across both agents merge into one row with `[claude] [codex]` badges; user and plugin skills are grouped by source

### Skill Doctor — _"is anything broken?"_

Surfaces the failures that happen silently:

- broken symlinks
- missing or unparseable `SKILL.md`
- a folder name that doesn't match the skill's name
- skills that have drifted out of sync between Claude and Codex
- stale plugin-cache versions

Each issue comes with a **ready-to-paste fix command**. Curator shows you the command — it never edits or deletes anything itself.

### Recommend Skills — _"which one should I use?"_

Describe a task in plain language and an AI ranks your most relevant skills, each with a one-line reason and a confidence level — catching matches that keyword search misses. Runs on **Raycast AI** out of the box, or any **OpenAI-compatible** provider with your own key.

## Who it's for

Anyone whose Claude Code / Codex setup has outgrown their memory — you install skills from several marketplaces, maintain your own, or run them across more than one agent, and you want them findable and healthy.

## Safe by design

Curator is **read-only on your filesystem.** Every fix is a shell command copied to your clipboard for you to review and run — nothing is changed or deleted behind your back, and the only thing it ever launches is your editor. Recommendations send your task plus a compact skill catalog to your chosen AI provider, and only when you press `⏎`.

## AI recommendations: choosing a provider

The default is **Raycast AI** — no setup, requires Raycast Pro. To use your own key instead, open the extension's preferences, set **Provider** to "Custom", and fill in the base URL, key, and model. Any OpenAI-compatible endpoint works; a few common ones:

| Provider                    | OpenAI-compatible base URL                                           | Get a key                                                  |
| --------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| 通义千问 (Qwen, Token Plan) | `https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1` | [百炼 / Model Studio](https://bailian.console.aliyun.com)  |
| DeepSeek                    | `https://api.deepseek.com`                                           | [platform.deepseek.com](https://platform.deepseek.com)     |
| MiniMax                     | `https://api.minimaxi.com/v1`                                        | [platform.minimaxi.com](https://platform.minimaxi.com)     |
| Xiaomi MiMo (token plan)    | `https://token-plan-cn.xiaomimimo.com/v1`                            | [platform.xiaomimimo.com](https://platform.xiaomimimo.com) |

> Verified against each provider's docs (2026); these are the **Token Plan** endpoints where a provider offers one. Alternatives: **Qwen** pay-as-you-go is `https://dashscope.aliyuncs.com/compatible-mode/v1`; **MiniMax** international is `https://api.minimax.io/v1`; **Xiaomi MiMo** is per-cluster (China `token-plan-cn`, Europe `token-plan-ams`), authoritative on its subscription page. Set the model id (e.g. `qwen3.7-max`, `deepseek-chat`) in **Custom Model**.

## Development

```
npm install
npm run dev      # run in Raycast
npm test         # unit tests
npm run lint     # lint
```

The core lives in `src/lib/` as small, dependency-light, unit-tested modules (scan → parse → aggregate → health → recommend); the Raycast UI is three thin `view` commands on top.
