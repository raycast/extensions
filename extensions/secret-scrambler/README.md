# Secret Scrambler

Quickly replace secrets with fake values before pasting a config file into a chat with an AI agent.

Select a token, password, login or any other sensitive value, press your hotkey, and the selection is replaced in place with a random string of the **same length and format**. The config still looks realistic to the agent, but the real secret never leaves your machine.

## Examples

| Before | After |
| --- | --- |
| `ghp_aB3xK9mQ2pL7zZ1yY0` | `ghp_Qz8rT1wNc5YkJm4Hb7` |
| `john.doe@example.com` | `kdxp.qwe@mrtwlzv.bnc` |
| `P@ssw0rd!` | `K@xbq4ze!` |
| `550e8400-e29b-41d4-a716-446655440000` | `3fa1c9d2-07be-8e4a-b5c1-92d0e6f7a813` |

## How it works

- Uppercase letters, lowercase letters and digits are replaced with random characters of the same class.
- Cyrillic letters are replaced with Cyrillic letters; letters and digits of other scripts are replaced with ASCII ones, so no part of the secret is left unchanged.
- Separators and special characters (`-`, `_`, `.`, `@`, `:`, `/`, `!` and others) stay in place.
- Well-known token prefixes are preserved: `sk-`, `sk-ant-`, `sk-proj-`, `ghp_`, `gho_`, `ghs_`, `github_pat_`, `glpat-`, `xoxb-`, `xoxp-`, `AKIA`, `eyJ`.
- Hex strings (UUIDs, hashes, keys) remain valid hex, including mixed-case ones.
- If the selection has no letters or digits, nothing is replaced and you get a notification.
- Randomness comes from Node's cryptographically secure `crypto.randomInt`.

## Setup

1. Open Raycast Settings → Extensions → Secret Scrambler → **Replace Selection with Random String**.
2. Record a hotkey, for example `⌃⌥R`.

## Notes

- The command reads the selection by simulating `⌘C`, so the original value briefly passes through the clipboard. If you use a clipboard history manager, consider excluding this extension or clearing the entry afterwards.
- The clipboard content you had before running the command is restored after the replacement.
