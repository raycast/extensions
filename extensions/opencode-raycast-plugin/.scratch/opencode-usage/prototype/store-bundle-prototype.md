# PROTOTYPE — store submission bundle (issue #8) — SETTLED

Reacted to on 2026-09-12; decisions baked in. This is the reference bundle the
handoff session transcribes into the real `CHANGELOG.md`, `README.md`, and
manifest edit. Screenshots are planned here, not captured.

Key reaction: **no `auth.json` reading**. The key is entered in Preferences and
titled **API key** (was "Go key (fallback)"), now required. Everything else
follows the prototype recommendations.

---

## 1. Draft `CHANGELOG.md` — SETTLED

Format required by `changelog_enforcer`: `## [<Title>] - {date}`. The merge
date is filled by the Raycast team at review; a placeholder today is fine.

```markdown
# Opencode Info Changelog

## [Opencode Info] - {PR_MERGE_DATE}

- Surfaced OpenCode Go usage in the menu bar and a full view: the three limit
  windows (rolling 5h, weekly, monthly) with used-percent and reset time.
- Added a live model catalog of OpenCode Go and OpenCode Zen models with
  current $/M pricing, sortable by cost, quota, or name.
- Added daily picks (stretch quota and best value) computed from current pricing.
- Added per-model quota estimates for the rolling 5h window.
- Added distinct error states for no key, bad key, missing entitlement, and
  offline (offline keeps the last-known data).
```

---

## 2. Rewritten store `README.md` — SETTLED

No auth-file documentation. Setup is: subscription + paste the API key in
Preferences.

```markdown
# Opencode Info

Track your [OpenCode Go](https://opencode.ai) usage from Raycast — the three
limit windows, the live model catalog, and the daily picks — in a full view
and a menu-bar command.

## Setup

You need an **active OpenCode Go subscription** — the extension surfaces
subscription usage, so there's nothing to see without one.

Then paste your **OpenCode Go API key** into the extension preferences:

1. Open Raycast → Extensions → **Opencode Info** → Preferences.
2. Enter your API key in the **API key** field.

The extension reads the key from preferences and fetches your usage, the model
catalog, and current pricing from opencode's public endpoints. Your key never
leaves this Mac.

## Features

- **Limit windows** — rolling 5h, weekly, and monthly usage with a used-percent
  and reset time.
- **Model catalog** — the live OpenCode Go and OpenCode Zen model list with
  current $/M pricing, sortable by cost, quota, or name.
- **Picks** — daily recommendations (stretch quota and best value) computed
  from current pricing.
- **Quota** — per-model estimated request capacity for the rolling 5h window.
- **Menu bar** — the OpenCode logo as a pill in the menu bar, refreshed every
  60 seconds.

## Notes

- This extension surfaces the opencode product family; today that is
  **OpenCode Go**, and future opencode features may join under the same
  extension identity.
- Inspired by the omarchy-opencode-usage KDE Plasma widget by ardfard
  (https://github.com/ardfard/omarchy-opencode-usage).

## License

[MIT](./LICENSE)
```

---

## 3. Manifest choice — SETTLED

`categories: ["Developer Tools"]`, keywords and description as proposed. The
`goKey` preference becomes required, retitled **API key**, fallback wording
gone:

```jsonc
// package.json
"description": "Track OpenCode Go usage from the menu bar — limit windows, model catalog, and daily picks.",
"categories": ["Developer Tools"],
"keywords": ["opencode", "usage", "subscription", "models", "quota", "limits", "go", "zen"],
"preferences": [
  {
    "name": "goKey",
    "title": "API key",
    "description": "Your OpenCode Go API key.",
    "type": "password",
    "required": true
  },
  // maxModels unchanged
]
```

Notes for handoff:
- Internal `name` can stay `goKey` (preferences persist by it); not published
  yet, so renaming to `apiKey` is also clean — pick one at handoff.
- Code change: drop the `auth.json` read in `src/lib/auth.ts` / `src/lib/usage.ts`;
  the key comes only from Preferences. `CONTEXT.md` glossary: "Go key" → "API
  key"; the `auth.json` entry no longer describes the primary key source.

---

## 4. Screenshot plan — SETTLED (capture blocked)

Raycast enforces: exactly 2000×1250, PNG, ≤6, one consistent background, no
dark mode, no local dev-icon in the bottom bar, no sensitive data / other apps.
Capture via **Window Capture → "Save to Metadata"**.

| # | File | View | Data to show |
|---|------|------|--------------|
| 1 | `opencode-raycast-plugin-1.png` | Full view, default | Go limits section (3 windows, real used-percent + reset times) at top, then Go models (a few with real $/M prices), Zen models below. No search text. |
| 2 | `opencode-raycast-plugin-2.png` | Full view, search active | Search text showing the **picks** — the daily "stretch quota" / "best value" tags with real model prices. |
| 3 | `opencode-raycast-plugin-3.png` | Full view, catalog detail | A model row with the `~N req/5h` quota accessory and a `free`/`also in Go` tag, to show pricing + quota + shared tagging. |
| 4 | `opencode-raycast-plugin-4.png` | Menu-bar dropdown | The OpenCode pill + dropdown with the three limit windows (real data), 60s refresh implied. |

**Precondition (blocker for capture):** real data requires a live OpenCode Go
subscription and a real API key. With `auth.json` reading gone there is **no
stub fallback** — the plan assumes the key in Preferences yields real data.
Capture happens at handoff once the code change lands and a live key exists.