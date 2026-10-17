# opencode-raycast-plugin

A Raycast extension for macOS that surfaces the user's opencode usage: limit windows, model catalog, and daily picks, in a full view and a menu-bar command. Branded for opencode as a product family — OpenCode Go is the subscription surface today, and future opencode features may join it under the same extension identity.

## Language

**opencode-raycast-plugin**:
The extension's identifier (package and command names, repo name). Its display name is **Opencode Info**.
_Avoid_: OpenCode Go as the extension's name

**OpenCode Go**:
The subscription product whose usage the extension surfaces today — the three limit windows, the model catalog, and the daily picks. Its data is keyed `opencode-go` in opencode's auth file and models.dev.
_Avoid_: opencode, when you mean this specific subscription

**OpenCode Zen**:
The sibling opencode-provided model surface — a catalog of tested models (70 at last count) served from `https://opencode.ai/zen/v1`, distinct from the Go subscription. No models.dev provider exists for it yet.
_Avoid_: zed, when you mean OpenCode Zen

**Product**:
The dimension that distinguishes the opencode-provided surfaces the extension catalogs — Go and Zen. Not to be confused with **Surface**, which means the full view vs the menu bar.

**API key**:
The OpenCode Go credential used to authenticate against the OCG API, entered by the user in the extension's Preferences.
_Avoid_: Go key, token, secret

**auth.json**:
The opencode credentials file at `~/.local/share/opencode/auth.json`. **Not read by the extension** — the API key comes from Preferences.
_Avoid_: config, settings file

**Limit windows**:
The three OCG usage windows — rolling 5h ($12), weekly ($30), monthly ($60) — each with a used-percent and a reset time.

**Model catalog**:
The live list of OpenCode Go models with current $/M pricing, sorted by cost, quota, or name.

**Picks**:
The daily model recommendations (stretch quota and best value), computed from current pricing.

**Quota**:
Per-model estimated request capacity for the rolling 5h window — `floor($12 ÷ costPerTurn)` with the typical-turn cost basis (830 input / 71,500 cached / 295 output tokens). Plugin-estimated, not defined by OCG.
_Avoid_: cap, allowance

**Modality**:
A model's input/output capability — text, image, video, audio — shown as plain text (`in text, image · out text`), sourced from models.dev `modalities`.
_Avoid_: icons for modalities

**Surface**:
One of the two places the extension renders usage: the **full view** (a normal Raycast command) or the **menu-bar command** (pill in the macOS menu bar).

**Pill**:
The menu-bar command's icon-only presence — the OpenCode logo as a template image, no text — which opens the dropdown.
_Avoid_: text in the menu bar

**Failure class**:
The extension's five error states: **no-key**, **bad-key** (401), **no-entitlement** (403), **service** (HTTP/parse failure), **offline** (transport failure). No-key/bad-key/no-entitlement/service show error states; only offline keeps last-known data.