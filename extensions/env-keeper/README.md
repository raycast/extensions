# Env Keeper

Manage every project's `.env` files and your global shell config from Raycast. **Local-only, free, keyboard-first.**

> The name comes from "butler": your `.env` files belong to you. The extension fetches, registers and guards them — it never keeps a copy of its own.

## What it solves

`.env` files are scattered across projects, and global environment variables hide in `~/.zshrc`. To find which project uses a given key, temporarily disable a variable, or generate a `.env.example` for your team, you end up opening files by hand. Env Keeper puts all of that into one keyboard-driven panel.

## Three highlights

- **Secrets are masked by default** — lists show `••••••••`; reveal with one shortcut. Copying a secret keeps it out of clipboard history.
- **A snapshot before every write** — full history for `.env` even though it never enters git; roll back anytime.
- **`.env.example` in one step** — generated as a **merge**, so hand-written notes in the template survive.

## Commands

| Command             | What it does                                                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Manage Envs**     | Projects: register a project, manage variables per environment, snapshots and restore, generate `.env.example`.<br>Shell: manage global variables / aliases / snippets and generate `~/.env-keeper/shell.sh`. |
| **Search Env Vars** | Search variable names or values across all projects, profiles and the shell config.                                                                                                                           |
| **Jump to**         | Open a project, env file, profile or shell snippet by name; snippets can be toggled in place.                                                                                                                 |

## Core design: files are the source of truth

The extension **stores no environment data**. Project environments are edited directly in the `.env` files under the project directory — there is no second copy, so it coexists naturally with git, teammates, Vite and Docker.

The file's fingerprint is recorded on open and checked again before save: if something else changed the file in between, you get to decide instead of a silent overwrite.

Everything the extension owns lives in `~/.env-keeper/`, fully transparent:

```
~/.env-keeper/
├── registry.json       # registered projects
├── shell.json          # shell snippets
├── shell.sh            # generated from shell.json, sourced by .zshrc
├── snapshots/          # history of each project's .env files
├── config-history/     # history of the two config files above
└── backups/            # backups taken before touching .zshrc
```

**Moving to a new machine = copying this directory.**

## Security boundaries (please read)

- Masking **affects display only**. `.env` and `shell.sh` must stay in plain text or your programs and shell can't read them. It protects against someone glancing at your screen, not against the file being read.
- The extension **does not encrypt**. For encryption use [dotenvx](https://dotenvx.com); Env Keeper recognizes the `encrypted:` prefix and stops you from editing those values by accident.
- The extension **never reads or modifies `.envrc`**. If one is present, it only tells you that direnv is in play.

## Compatibility

- macOS with zsh or bash as the login shell (the real login shell is detected to decide between `~/.zshrc` and `~/.bash_profile`).
- With fish or another shell, syntax validation is skipped automatically and never blocks saving.
- Inline comments in `.env` are parsed the same way `dotenv` does, so the value shown in the UI equals the value your program gets.
