# Prompt Studio

Prompt Studio turns Raycast into a local shelf for prompts you want to reuse.
Save a prompt once, find it by what it does, and paste it into Codex, Claude
Code, or any other application.

![Browse a local prompt library](media/prompt-library.jpg)

## What the initial Store release does

- Stores every prompt as a readable Markdown file.
- Searches titles, summaries, tags, aliases, and prompt text.
- Previews the exact text before you use it.
- Pastes into the frontmost application or copies to the clipboard.
- Creates, edits, duplicates, archives, restores, and deletes prompts.
- Fills reusable `{{placeholders}}` immediately before paste or copy.
- Keeps frequently used prompts available from the macOS menu bar.

![Create a prompt without an external service](media/create-prompt.jpg)

The initial Raycast Store package exposes two commands:

1. **Prompt Studio** — browse and maintain the library.
2. **Most-Used Prompts** — copy a prompt from the macOS menu bar.

It does not require an account or API key, and the included commands make no
Prompt Studio network requests. See [PRIVACY.md](PRIVACY.md) for the exact data
boundary.

## Prompt files

Markdown files are the source of truth: the files you can read and recover
without Prompt Studio. The default folder is:

```text
~/Library/Application Support/Prompt Studio/Prompts
```

You can choose a different absolute path or a path beginning with `~/` in the
extension preferences.

A prompt has a machine-readable metadata block followed by the prompt body:

```markdown
---
schema_version: 1
id: 8a1704de-1f9d-4b65-84f8-73508e52b0a7
title: Review a pull request
summary: Find correctness and security risks before merge.
target: generic
tags:
  - code-review
aliases:
  - inspect a PR
search_terms:
  - regression risk
created_at: 2026-07-23T00:00:00.000Z
updated_at: 2026-07-23T00:00:00.000Z
favorite: false
sources:
  - kind: manual
    provider: local
    retrieved_at: 2026-07-23T00:00:00.000Z
---
Review {{pull_request}} for correctness, security, and regression risks.
```

Any local cache or search index is disposable: it is like a card catalog, while
the Markdown files are the books. Rebuilding the catalog never replaces the
books.

## Install from source

Source development requires macOS, Raycast, Node.js 22 or newer, and pnpm.

```bash
git clone https://github.com/alexgrama-dev/Prompt-Studio.git
cd Prompt-Studio
pnpm install
pnpm dev
```

Raycast opens the development extension. Search for **Prompt Studio** to create
or browse prompts.

## Development

Run the full verification set:

```bash
pnpm check
```

Create and verify the smaller package submitted to the Raycast Store:

```bash
pnpm check:store
```

The Store package is written to the ignored `dist-store/` directory. Its
preparation script copies only an explicit list of public files, so internal
verification material, experiments, and local project notes cannot be included
by accident.

Important directories:

```text
src/        Raycast commands and shared application logic
test/       behavior checks for local logic
cli/        experimental local command-line interface
mcp/        experimental local agent interface
openspec/   behavior proposals and decisions
store/      public Raycast Store manifest and dependency lock
```

The repository contains advanced enhancement, research, command-line, and agent
features under active development. They are not commands in the initial Store
release. This keeps the first public install useful without asking a new user
for credentials or presenting controls that cannot yet be activated from the
public interface.

## Contributing and security

Focused issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md)
before changing behavior. Report suspected vulnerabilities privately as
described in [SECURITY.md](SECURITY.md).

Prompt Studio is available under the [MIT License](LICENSE).
