# Spike: Typed show-entry model instead of text round-tripping

## Current data flow

The current show path is:

`rpass show --json` → internal `ShowEntryJson` in `src/rpass/application/rpass-client.ts` → `formatShowEntryOutput` newline string → `parseVaultEntryRows` in `src/vault/domain/vault-entry-content.ts` → `Content` renders rows → rows named `otpauth` render `OtpRow`.

This preserves the old text-based UI shape, but it loses the distinction between CLI fields and extra plain-text lines after formatting.

## Candidate typed model

A future model could live in `src/vault/domain/vault-entry-content.ts` or a new adjacent file:

```ts
export interface VaultEntryContent {
  password: string;
  fields: { name: string; value: string }[];
  otpUri?: string;
  extraLines: string[];
}
```

`src/rpass/application/rpass-client.ts` could export `showEntryContent(entry, storeDir, passphrase?)` returning this typed model while keeping the existing `showEntry()` string function temporarily for compatibility.

Rendering could then map typed content into rows without reparsing field syntax:

- password row: `{ name: "pass", value: content.password }`;
- field rows: direct from `content.fields`;
- OTP row: from `content.otpUri`;
- extra lines: stable row type/name such as `note` with the original line as value.

## Migration strategy

1. Keep the current `showEntry()` API while tests characterize existing behavior.
2. Add a typed `showEntryContent()` function and tests for password, fields, OTP URI, extra lines, invalid JSON, and passphrase stdin.
3. Update `Content` to consume typed content and convert it to rows using a domain helper.
4. Keep `OtpRow` behavior unchanged: it should still call `generateOtp(entry, storepath, passphrase)` unless the CLI later supports generating from an OTP URI directly.
5. Remove text round-tripping only after tests prove UI rows are unchanged for normal entries and improved for extra lines.

## Future tests

- Password-only entry.
- Field value containing colons, e.g. `url: https://example.invalid/login`.
- OTP URI present.
- Extra line without a colon.
- Empty optional `otp_uri` absent.
- Invalid JSON maps to `RpassError("rpass_invalid_json")`.
- Passphrase flows still use `--passphrase-stdin`.

## Recommendation

Defer the full typed refactor until the smaller correctness fixes and rpass-client contract tests are in place. After plan 003, the current text path is acceptable. Revisit this typed model when adding write flows or richer entry editing, because those features will benefit more from preserving field vs extra-line identity.
