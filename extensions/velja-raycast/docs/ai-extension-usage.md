# AI Extension Usage

This extension exposes AI tools so Raycast AI can query and manage Velja rules.

## Where to use it

- Quick AI
- AI Chat
- AI Commands

Use the extension mention that matches your active profile:

- Dev profile (default in this repo): `@velja-dev`
- Upstream/store profile: `@velja-raycast`

## Available AI tools

- `get-preferred-browsers`
  - Lists browser/profile identifiers in Velja picker order.
- `list-velja-rules`
  - Returns existing rules with summaries.
- `find-velja-rules-by-domain`
  - Finds rules matching a domain or URL across `host`, `hostSuffix`, and `urlPrefix`.
- `create-velja-rule`
  - Creates a new Velja rule (with confirmation before execution).

## Prompt examples

### Read-only queries

- `@velja-dev What rules do I have for medium.com?`
- `@velja-dev Show me all my enabled rules`
- `@velja-dev Which rules can match https://dev.azure.com/my-org/project`

### Write queries

- `@velja-dev Create a rule for medium.com that opens in Safari`
- `@velja-dev Add a hostSuffix rule for github.com to Edge Beta profile 7`

## Tool behavior guardrails

- Read-only prompts should call `list-velja-rules` or `find-velja-rules-by-domain`.
- Write tool (`create-velja-rule`) should only be used when the user explicitly asks to create/change rules.
- For domain-based creation, default matcher kind is `hostSuffix` unless the user asks for exact `host` or `urlPrefix`.
- Browser identifiers used for creation should come from `get-preferred-browsers`.
