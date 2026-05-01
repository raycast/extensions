# Humane — AI Text Humanifier

Make AI-generated text sound naturally human-written. Humane runs your text through a multi-phase pipeline that strips corporate buzzwords, replaces AI-isms, applies contractions, and rewrites for a natural tone — all powered by Raycast AI (no API keys needed).

## Commands

### Humanify Text

Paste AI-generated text, pick an intensity level, and get a detailed result with stats and a word-level diff of every change made.

| Shortcut | Action |
|----------|--------|
| `⌘ ↵` | Submit text for rewriting |
| `⌘ ⇧ V` | Paste from clipboard and process immediately |

### Humanify Clipboard

Instantly rewrites whatever is on your clipboard and replaces it with the humanified version. No UI needed — just trigger and paste.

## Intensity Levels

| Level | Description |
|-------|-------------|
| **Clean** | Fixes only the worst AI-isms. Keeps it professional. |
| **Rewrite** | Restructures sentences. Casual but competent. |
| **Strip** | Very short sentences. Direct, terse, no fluff. |

## How It Works

Humane uses a three-phase pipeline:

1. **Rule-based cleanup** — Pre-compiled regex matchers replace banned phrases, corporate buzzwords, and em-dashes. Contractions are applied in non-clean modes.
2. **AI rewrite** — Raycast's built-in AI rewrites the cleaned text with intensity-appropriate creativity and tone instructions.
3. **Diff generation** — A word-level LCS diff algorithm highlights exactly what changed between your original and the final output.

## Preferences

| Name | Description | Default |
|------|-------------|---------|
| Default Intensity | How aggressively to rewrite text | Rewrite |