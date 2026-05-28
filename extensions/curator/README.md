# Curator

**Your skills, curated.** A Raycast extension that gives you a fast, searchable
view of every skill installed for Claude Code and Codex, tells you which ones
are broken, and — when you can't remember what you have — lets an AI recommend
the right skill for the task you describe.

You have dozens of skills spread across user directories, plugin marketplaces,
and version caches, named in a mix of conventions you can never quite remember.
Curator turns that sprawl into one keystroke.

## Commands

### Search Skills

The launcher. Fuzzy-search every installed skill by name, purpose, or trigger
phrase. `⏎` copy the name · `⌘⏎` copy as `/command` · `⌘⇧T` copy a trigger ·
`⌘D` preview `SKILL.md` · `⌘O` open in editor · `⌘R` rescan.

### Skill Doctor

The check-up. Lists health issues — broken symlinks, missing/unparseable
`SKILL.md`, name ≠ directory, Claude↔Codex drift, stale plugin cache — each with
a one-keystroke **Copy Fix Command**. Fixes are copied to your clipboard, never
applied for you.

### Recommend Skills

Describe a task in plain language and an AI ranks the most relevant installed
skills, each with a one-line reason. Uses **Raycast AI** by default (requires
Raycast Pro); or point it at any **OpenAI-compatible** provider with your own
key via Preferences → Provider → "Custom".

#### Recommended providers (custom / bring-your-own-key)

Paste the base URL into **Custom API Base URL**, your key into **Custom API
Key**, and a model id into **Custom Model**.

| Provider                    | OpenAI-compatible base URL                                           | Get a key                                                  |
| --------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| 通义千问 (Qwen, Token Plan) | `https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1` | [百炼 / Model Studio](https://bailian.console.aliyun.com)  |
| DeepSeek                    | `https://api.deepseek.com`                                           | [platform.deepseek.com](https://platform.deepseek.com)     |
| MiniMax                     | `https://api.minimaxi.com/v1`                                        | [platform.minimaxi.com](https://platform.minimaxi.com)     |
| Xiaomi MiMo (token plan)    | `https://token-plan-cn.xiaomimimo.com/v1`                            | [platform.xiaomimimo.com](https://platform.xiaomimimo.com) |

> Verified against each provider's docs (2026); these are the **Token Plan**
> endpoints where a provider offers one. Alternatives: **Qwen** pay-as-you-go is
> `https://dashscope.aliyuncs.com/compatible-mode/v1`; **MiniMax** international
> is `https://api.minimax.io/v1`; **Xiaomi MiMo** is per-cluster (China
> `token-plan-cn`, Europe `token-plan-ams`), authoritative on its subscription page.

## Safe by design

Curator **never writes to or deletes from your filesystem.** Every fix is a
shell command copied to your clipboard, for you to review and run yourself. The
only process it ever launches is your editor (via `execFile`, no shell). Skill
recommendations send your task text plus a compact skill catalog to your chosen
AI provider — and only when you press ⏎.

## Development

    npm install
    npm run dev      # run in Raycast
    npm test         # run unit tests
    npm run lint     # lint

The core lives in `src/lib/` as pure, dependency-light modules with a full
unit-test suite; the Raycast UI is three thin `view` commands on top.

## Status

v1 (Search + Doctor) and v2 (Recommend) are merged. Roadmap (v2.1): multi-skill
**pipeline** recommendation — describe a goal, get an ordered workflow across
several skills.
