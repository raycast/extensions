# TweetCraft for Gemini

TweetCraft is a local-first Raycast extension that rewrites Chinese text into natural English for X/Twitter using Gemini.

## Product goal

Make bilingual posting fast enough to feel like a native Raycast command:

```text
⌥ Space
tp
<Chinese text>
↵
```

The result should be:

1. natural English suitable for X,
2. copied to the clipboard automatically,
3. ready to paste with `⌘V`.

TweetCraft is not intended to be a literal translation tool. It should preserve the user's meaning while producing concise, idiomatic English that feels written for the target platform.

## Current release

`v1.2.0`

The current implementation includes:

- Natural rewrite
- Punchy rewrite
- Short rewrite
- Reply rewrite
- Setup check
- Local draft recovery
- Recent draft history
- Retry after failure
- Error classification
- Clipboard-first output
- Proxy-aware Gemini requests
- Per-record local history storage with automatic v1 migration
- Automated history policy and proxy-redaction tests

## Raycast command aliases

Recommended aliases:

| Alias | Command                  |
| ----- | ------------------------ |
| `tp`  | Natural                  |
| `tpx` | Punchy                   |
| `tps` | Short                    |
| `tpr` | Reply                    |
| `tph` | Recent TweetCraft Drafts |

Existing aliases are part of the product interface and should not be broken without an explicit migration plan.

## Product principles

### Keyboard first

The normal workflow should require no mouse interaction.

### Local first

User drafts and rewrite history remain on the user's Mac.

### Failure safe

The original Chinese input must remain recoverable even when Gemini, the proxy, or the network fails.

### Clipboard first

A successful rewrite is copied automatically. On failure, the original Chinese text is copied so the user can continue working.

### Privacy first

API keys must never be written into history, logs, source control, diagnostics, or error messages.

### Native output, not literal translation

The output should preserve intent while sounding natural to an English-speaking X user.

### Small and maintainable

Prefer straightforward TypeScript and Raycast APIs over unnecessary infrastructure or dependencies.

## Current history policy

- Store at most 50 records.
- Delete records older than 30 days.
- Deduplicate identical Chinese input submitted within 5 minutes.
- Store data locally only.
- Never store the Gemini API key.
- Record categorized errors.
- Update the existing record when a retry succeeds.

## Runtime constraint

The user's Mac may use a local proxy such as:

```text
http://127.0.0.1:7897
```

Raycast does not necessarily inherit the same proxy environment as Terminal. Proxy handling must therefore remain explicit and testable inside the extension.

No proxy is configured by default. Auto mode connects directly unless the user explicitly provides a proxy URL.

## Repository structure

The implementation lives primarily under `src/`. See `ARCHITECTURE.md` for a module-level overview.

## Definition of done

A change is complete when:

- the intended Raycast workflow works,
- existing aliases still work,
- no API key or private draft is exposed,
- failure behavior is safe,
- `npm test` passes,
- `npm run build` passes,
- lint/type errors introduced by the change are resolved or explicitly documented.
