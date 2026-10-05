---
name: Memos for Raycast
description: Fast, native-feeling access to a Memos instance from inside Raycast.
colors:
  primary-text: "raycast-primary-text"
  secondary-text: "raycast-secondary-text"
  accent-blue: "raycast-blue"
  accent-green: "raycast-green"
  accent-magenta: "raycast-magenta"
  accent-orange: "raycast-orange"
  accent-purple: "raycast-purple"
  accent-red: "raycast-red"
  accent-yellow: "raycast-yellow"
---

# Design System: Memos for Raycast

## 1. Overview

**Creative North Star: "The Invisible Extension"**

This extension has no visual system of its own — by design. `@raycast/api`'s `Color` enum doesn't even expose hex values (`Color.Blue` is the literal string `"raycast-blue"`); Raycast resolves every color dynamically against whatever theme the user picked. There is no CSS, no font stack, no spacing scale to author. The only design surface left is content: what a `Detail` view's Markdown says, which `Icon` an action carries, whether an accent color earns its place, and how actions are ordered in an `ActionPanel`.

The system rejects anything that asserts its own visual identity against Raycast's chrome — no forced brand color standing in for the user's actual theme, no ceremony-heavy screens, no copy that explains itself twice. It should read as though Raycast shipped it.

**Key Characteristics:**
- Zero hardcoded color values; every color reference is a theme-adaptive token or nothing at all.
- State (loading / error / success) is carried by emoji + text together, never by color alone.
- Markdown content in `Detail` views is short: one status line, one numbered list, at most one caveat.
- `ActionPanel` order mirrors the user's actual next step, fastest fix first.

## 2. Colors

There is no project-owned palette. `Color.PrimaryText` and `Color.SecondaryText` are the defaults for anything textual that needs a semantic weight; the seven accent tokens exist for rare, meaningful categorization, not decoration.

### Primary
- **Primary Text** (`raycast-primary-text`): default text weight inside Markdown and list titles. Adapts to the user's light/dark theme automatically — never override with a literal color.

### Secondary
- **Secondary Text** (`raycast-secondary-text`): metadata, timestamps, subtitles — anything that should read as quieter than the primary line.

### Neutral
- **(inherited)**: backgrounds, borders, and surface chrome belong entirely to Raycast's theme. This extension defines none of it.

### Accents (use sparingly)
- **Blue / Green / Magenta / Orange / Purple / Red / Yellow** (`raycast-blue` … `raycast-yellow`): reserved for categorical meaning that's genuinely useful at a glance (e.g. a future memo's visibility or pinned state) — not for brand decoration. Each is theme-adjusted by Raycast for contrast; treat the name, not a hex value, as the token.

### Named Rules
**The No-Hex Rule.** No color in this project is ever a literal hex value. If a screen needs a color, it's one of the tokens above or it's the wrong approach.

**The Color-Is-Never-Alone Rule.** Any state or category signaled by an accent color must also be signaled by text or an icon. Setup checklist tags follow this: the tag value ("Accepted" / "Rejected") carries the state; green/red tint is optional.

## 3. Typography

Not controlled by this extension. Raycast renders all text through the OS-level font Raycast itself picked for its theme; there is no font family, size, or line-height this project can set. Markdown emphasis (`**bold**`, `` `code` ``, headings) is the only typographic lever available, and it's used for structure (status line, step numbers, inline values), not decoration.

### Hierarchy
- **Heading** (`# Connect Raycast to Memos`): one per `Detail` view, names what the screen is for.
- **Status line** (plain text, led by an emoji): the single most important fact on the screen, always first.
- **Body** (numbered steps, bold lead words): the instructions; each step leads with a **bold** term naming the field or action it concerns.
- **Caveat** (blockquote `>`): at most one, for a fact that matters but isn't the main flow (where preferences live, what happens on reset).

### Named Rules
**The One Status Line Rule.** Every `Detail` view has exactly one line that states current state in plain language, placed immediately under the heading, before any instructions. Setup Memos no longer uses a Detail status line — its checklist List rows carry state instead.

## 4. Elevation

None. Raycast's `List`, `Detail`, and `Form` chrome is flat by construction — there are no shadows, borders, or layering this extension can add or would want to. Depth, when it matters, is conveyed by ordering and disclosure (what's shown now vs. behind an action), not by visual layering.

## 5. Components

### Setup checklist (List)
- **Structure:** a `List` with Status (Connection) and Settings (Instance URL, Access Token) sections. See `setupStatus.ts` for the pure state → row descriptors.
- **Tone → icon:** `pending` → `Icon.CircleProgress`; `success` → `Icon.CheckCircle` + `Color.Green`; `failure` → `Icon.XMarkCircle` + `Color.Red`; `neutral` → `Icon.Circle`. Tag text always states the state ("Accepted" / "Rejected" / "Not verified" / "Demo"); color is optional reinforcement, never the only signal.
- **Loading:** `isLoading` on the `List` itself (Raycast's built-in loading bar).

### Memo detail
- **Body:** the memo Markdown itself (`Detail` or `List.Item.Detail`).
- **Metadata:** Created, Updated, Visibility (with Lock / TwoPeople / Globe icon) and Tags (TagList when present). Pinned only when true.

### Form (Create / Edit Memo)
- **Shared:** one `MemoForm` view; the command passes `navigationTitle` and the submit title (“Save Memo” / “Save Changes”).
- **Primary action:** Save Memo (`Action.SubmitForm`).
- **Preview:** ⌘P / Ctrl+P pushes a `Detail` of the draft Markdown.
- **After save:** push a rendered `MemoDetail` of the saved memo.
- **Edit:** ⌘E from a Search Memos row, shown only on the current user's memos; after save, pop back to the refreshed list.

### ActionPanel
- **Order:** the action that unblocks the user fastest comes first, then supporting actions, then the "leave the extension" escape hatch last. Setup Memos's per-row panels follow this: retry or get token first when blocked, preferences next, open Memos last.
- **Icons:** every `Action` carries an `Icon` (`Icon.Gear`, `Icon.ArrowClockwise`) that names its verb; no icon-less actions once there's more than one item.
- **Shortcuts:** reuse `Keyboard.Shortcut.Common.*` (`Refresh`, `Open`, …) whenever the action matches a common one. Only assign a custom shortcut (e.g. ⌘T for "Get Access Token") when no common shortcut fits, and pick a mnemonic key.

### Errors
- **Style:** one sentence, names the instance URL and the concrete fix, never a raw status code or stack trace. For Detail views that still use a status line, render it there; for Setup, the Connection row subtitle and the failure toast carry it.

## 6. Do's and Don'ts

### Do:
- **Do** use `Color.PrimaryText` / `Color.SecondaryText` or leave `tintColor` undefined so icons and text inherit the user's theme automatically.
- **Do** pair any accent color with text or an icon that carries the same information on its own.
- **Do** lead every `Detail` view with a single, plain-language status line before any instructions.
- **Do** order `ActionPanel` items by what unblocks the user fastest: fix → verify → escape hatch to the web app.
- **Do** name the instance URL and the exact fix in every error message (per `docs/philosophy.md`'s "Errors are for humans").
- **Do** reuse `Keyboard.Shortcut.Common.*` before inventing a custom shortcut.

### Don't:
- **Don't** hardcode a hex color anywhere — there is no brand palette to defend, only the user's own Raycast theme.
- **Don't** signal state or category through color alone.
- **Don't** build a custom onboarding flow, splash state, or branded chrome that competes with Raycast's own UI (per PRODUCT.md's anti-references: no heavyweight sync-client feel).
- **Don't** write chatty, apologetic, or marketing-toned copy, especially in error states.
- **Don't** add a loading spinner, custom progress copy, or any affordance Raycast's `isLoading` prop already provides.
- **Don't** turn any command into a dashboard with more than one screen's worth of decisions at once (per `docs/philosophy.md`'s "fast paths first").
