# Superhuman Skills (Raycast)

Multi-step workflow prompts that chain Superhuman's MCP tools into named, reusable operations. Skills are what make the MCP feel like an assistant rather than a tool surface.

Each skill is a self-contained `SKILL.md` with frontmatter declaring the tools it uses and whether it writes to your account.

## How they're surfaced

### In Raycast

One root command — **Browse Superhuman Mail Skills** — opens a list of every skill with live previews, copy-prompt actions, links to the upstream source, and a refresh-from-upstream action.

In Raycast AI Chat (`@superhuman …`), two AI tools expose the same library:

- **`list-skills`** — returns the catalog (name, description, tools used, read-only flag, source provenance).
- **`run-skill`** — accepts a slug (`morning-briefing`) or fuzzy title (`Morning Briefing`, `briefing`) and returns the skill's prompt plus the list of tools it expects to chain. The AI follows the returned instructions and calls the listed tools.

### Auto-injected routing prelude

`run-skill` appends a short "Operating rules" prelude after every skill body it returns. The prelude:

- Routes structured triage to `list-threads` (not `query-email-and-calendar`).
- Tells the AI to format threads as clickable `[Sender — Subject](url)` Markdown links using the `url` field that `list-threads` / `get-thread` / `get-message` now inject into every response.
- Standardizes the fallback when `url` is missing (bracketed 16-char hex thread ID, never a placeholder).

Authors of upstream skills don't need to know about this — the extension wraps the body at run time. To opt a skill out (rare), set `skip_extension_prelude: true` in its frontmatter.

### In Claude Code / other MCP clients

These `SKILL.md` files match Superhuman's official Skills Library format. Any MCP client that supports skills (Claude Code, Cursor, etc.) can load them directly from this directory.

## Source resolution

Skill content is resolved at runtime through a three-tier chain:

1. **LocalStorage cache** — 24-hour TTL, per-skill, keyed by slug. Stored in Raycast's local storage.
2. **GitHub upstream** — `superhuman/mcp-mail/skills/<name>/SKILL.md`. 5-second fetch timeout. Updates land for users without an extension release.
3. **Bundled fallback** — `src/lib/skill-content.generated.ts`, written at build time by `scripts/embed-skills.ts`. Always present, so the extension works offline and on first launch.

The Browse Skills view shows the source for each row (`bundled` / `cached` / `live`) and "updated N ago" so you can see what you're looking at.

## Bundled skills

| Skill | Purpose | Writes? |
|---|---|---|
| `morning-briefing` | Overnight inbox triage + today's calendar | no |
| `eod-wrapup` | End-of-day summary + tomorrow's calendar | no |
| `meeting-scheduler` | Resolve participants → availability → invite | yes |
| `deal-tracker` | Cross-source view of a deal/customer | no |
| `batch-draft-writer` | Generate drafts across many threads from one prompt | yes |

## Read-only mode

Skills with `read_only: false` in frontmatter check the extension's read-only-mode preference at runtime. `run-skill` returns `read_only_blocked: true` and a `notes` field instructing the AI to refuse the action. The Browse Skills view shows a red lock icon and a banner.

## Upstream sync (build-time)

`scripts/sync-skills.ts` pulls the latest upstream content, diffs against the local copies, and surfaces any drift. `scripts/embed-skills.ts` regenerates `src/lib/skill-content.generated.ts` from the source `SKILL.md` files so the bundled fallback stays in sync.

A weekly GitHub Action template at `scripts/sync-skills.workflow.yml` does the same in CI. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the install path (the monorepo blocks per-extension `.github/`, so it needs to be copied to the monorepo root).

The bundled fallback is the safety net. The runtime resolver is what users see day-to-day.
