# Tiny Dev Tools

[English](README.md) · [简体中文](README-zh.md)

A tiny developer toolbox for Raycast — 9 commands covering the everyday conversions, hashing, decoding and code generation you do between editor, browser and terminal. Zero external runtime dependencies, fully offline, everything stays on your machine.

| Command | What it does |
|---|---|
| Timestamp | Convert Unix timestamps (s/ms/µs) ⇄ dates, relative time, multi-format output |
| URL Codec | Encode / decode URLs: 4 modes incl. smart multi-round decoding |
| JSON Format | Format, validate & minify JSON with clear error position |
| Base64 | UTF-8 safe Base64 encode / decode, URL-safe tolerant |
| Hash | MD5 / SHA-1 / SHA-256 / SHA-512 / HMAC-SHA256 (`text \|\| key`) |
| Password Generator | CSPRNG passwords & passphrases with strength estimation |
| JWT Decoder | Decode claims, humanized time, verify HS256 / RS256 / ES256 locally |
| Case Converter | camelCase / snake_case / kebab-case / PascalCase / CONSTANT_CASE / dot.case |
| JSON to Types | Generate TypeScript / Java / Go / Python types from JSON |

**Clipboard prefill**: every command auto-fills from your selection or clipboard — copy a token, open the command, results are already there.

## Commands

### ⏱ Timestamp
- Empty input = live clock: current Unix seconds / milliseconds / microseconds, local / UTC / ISO time — Enter to copy
- Type a timestamp (10–16 digits auto-detects s/ms/µs) → local / UTC / ISO / relative time
- Type a date string (`2026-11-03 12:30:30`, ISO) → all three timestamp units
- Type a relative expression: `-1d`, `+2h30m`, `-1w` (combine s/m/h/d/w)
- Prefill: numeric text

### 🔗 URL Codec
- `encodeURIComponent` / `encodeURI` / `decodeURIComponent`
- **Smart decode**: applies `decodeURIComponent` repeatedly until the output stops changing (max 5 rounds) — double- or triple-encoded URLs from logs and tracking links are restored in one step
- Swap input/output (⌃X), clear (⌃K), copy / paste actions
- Prefill: input containing `%XX` switches to decode mode; plain URLs and ordinary text stay in encode mode

### 🧾 JSON Format
- Pretty-print with 2 / 4-space indent, or minify to a single line
- Recursive key sorting (a lifesaver for diffing)
- Syntax validation with line/column position in the error message
- Prefill: JSON from selection or clipboard (shared input-prefill framework)

### 🔤 Base64
- UTF-8 safe: CJK text and emoji round-trip cleanly
- Decoding tolerates URL-safe characters (`-` / `_`) and missing padding
- Convert result to URL-safe, swap input/output (⌃X), clear (⌃K)
- Prefill: valid Base64 switches to decode mode; plain text stays in encode mode

### # Hash
- MD5 / SHA-1 / SHA-256 / SHA-512 / HMAC-SHA256, all at once side by side, lowercase and uppercase pairs
- List mode: ↑↓ to move, Enter to copy any row; HMAC uses the `text || key` syntax — leave the key empty to skip
- What you type is what gets hashed (nothing is trimmed around `||`); empty input shows the syntax help
- Prefill: any text (the key side is never prefilled)
- Note: input is single-line (search bar); large multi-line text is not supported yet. MD5 / SHA-1 are for checksums and legacy use, not security

### 🔑 Password Generator
- Random password + passphrase side by side, Enter to copy; ⌘R regenerates both
- Three presets (Enter to select): Easy to say (letters only) / Easy to read (no ambiguous characters) / All characters (91-char set)
- Type a number to adjust length: password 8–64 (default 16), words 3–8 (default 6 = 60 bits)
- Entropy strength indicator (bits + Weak/Fair/Strong/Very strong); at least one character from each class
- Randomness from `crypto.randomBytes` (CSPRNG, rejection sampling with no modulo bias); nothing is ever persisted

### 🔓 JWT Decoder
- Paste a three-segment token to decode instantly: header / status / claims as rows, Enter to copy a value
- Time claims (exp/iat/nbf) shown twice: raw timestamp + local time + relative time
- Status from the local clock: Expired / Not yet valid / Valid / No expiry claim
- Local signature verification: HS256 (`token || key` inline), RS256 / ES256 (⌘V opens the verification panel — paste a PEM / JWK public key or a file path, auto-detected; a key on the clipboard is prefilled automatically)
- `alg: none` shows "Unsigned · verification skipped"; three distinct error states: signature mismatch / key type mismatch / unparseable key
- Prefill: three-segment JWTs
- Fully offline — tokens and keys never leave your machine and are never persisted

### 🏷 Case Converter
- Six styles side by side: camelCase / PascalCase / snake_case / kebab-case / CONSTANT_CASE / dot.case
- Any style in, all styles out (no source-style picker); ↑↓ to move, Enter to copy
- Word splitting follows change-case v4 (verified against two libraries on 30 cases): a run of capitals stays with the previous word (XMLHttpRequest → XML|Http|Request), digits stay with the preceding word (base64Encode → base64|encode)
- Prefill: text shaped like an identifier

### 🧬 JSON to Types
- Paste JSON to generate type declarations: TypeScript interface / Java class (nested static classes) / Go struct (json tags) / Python dataclass
- Switch languages with ↑↓ + Enter; copy the full code block or a single type
- Inference rules: numbers are tiered by value (Integer/Long/Double, int/int64/float64), a lone `null` field → unknown, `null` mixed into an array field → `T | null`, mixed arrays → union (merged to `number` in TypeScript), root arrays in three forms (alias / homogeneous promotion / heterogeneous union with optional fields), invalid keys are sanitized per language
- Prefill: copy an API response

## Clipboard prefill

Selection first, clipboard as fallback: copy something and open the command — it is already filled in (the clipboard path needs **no permission**). The selection path needs the macOS Accessibility permission (System Settings → Privacy & Security → Accessibility, enable Raycast); without it the clipboard path is used automatically. Prefill stops applying as soon as you type (and does not come back after clearing); key material is never prefilled.

## Installation

Install from the [Raycast Store](https://raycast.com/store): search "Tiny Dev Tools".

> The Store listing will be available once the extension passes review. Until then the extension is not publicly installable.
