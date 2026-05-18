# Commafy Changelog

## [Initial Version] - {PR_MERGE_DATE}

### Added

- **Commafy Selection** — Insert thousand-separator commas into integers in the current text selection.
- **Decommafy Selection** — Strip thousand-separator commas from numbers.
- **Normalize Full-Width Digits** — Convert `０`-`９` to `0`-`9` and full-width numeric punctuation (`．，－＋／`) to half-width (`.`, `,`, `-`, `+`, `/`). Also normalizes the standalone `U+2212 MINUS SIGN` to `-`.
- **Commafy with 万/億** — Format integers using Japanese myriad units (万, 億, 兆).
- **Preview Commafy** — Side-by-side before/after preview that compares the standard and Japanese-unit formatting before applying.
- Per-command preferences: minimum digits, separator character, decimal handling, year/hyphen exclusion toggles, and an optional full-width digit normalization pass.
- Smart exclusions by default: decimal numbers, hyphen-separated digit groups (phone numbers, `yyyy-mm-dd` dates), and Japanese year tokens (`xxxx年`) are left untouched.
- Graceful clipboard fallback when paste fails in restricted text fields.
- Result HUDs report the number of tokens that were actually changed.
- Smart partial-grouping guard: malformed numbers like `1234,567` and `1234,5678` are left alone to avoid producing nonsense like `1,234,5,678`.
- Alphanumeric-identifier guard: tokens like `SKU1234A`, `v1234`, and scientific notation `1234e5` are skipped.
- Safe handling of separator characters containing regex-replacement specials (`$`, `\`, etc.).
- Ambiguity guard: when `Separator` is `.` and `Format Decimals` is on, decimal formatting is silently disabled to avoid generating output like `1.234.56`.
- Distinct loading / empty / error states in `Preview Commafy`, with markdown-fence-safe rendering of the original selection.
- Connector-style identifier guard: `INV-1234567`, `SKU_12345`, `ABC/12345`, and the like are skipped.
- Separator-aware idempotence: with a non-comma separator (e.g. `_`), `1_234_567` is recognised as already formatted and `1234_5678` is recognised as malformed; both are left alone.
- `Commafy with 万/億` now uses compact Japanese unit notation by default (drops all-zero lower groups, strips leading zeros within non-leading groups). Use `Preview Commafy` to also see the comma-augmented variant side-by-side.
- Extended unit coverage in `Commafy with 万/億` up to 秭 (10²⁴).
- `Preview Commafy` now reports normalization counts and shows both compact and comma-augmented 万/億 variants for a side-by-side comparison before pasting.
- Removed the `Period` option from `Decommafy` — it ambiguously stripped decimal points.
- Scientific-notation hardening: explicit `\d+(\.\d+)?[eE][+-]?\d+` exclusion plus `(?!\d*[A-Za-z])` lookahead prevents partial-match backtracking such as `12345e6 → 1,2345e6`.
- Library entry points now sanitize empty / undefined separator strings (fall back to `,`).
- Manifest declares `"platforms": ["macOS"]` to match the macOS-only selection workflow.
- Tightened identifier boundary to a single combined lookbehind `(?<![A-Za-z][-_/]?\d*)` that catches both letter-then-digits (`abc123456`) and letter-then-separator-then-digits (`INV-1234567`) — eliminates partial-match cases like `abc123456 → abc123,456`.
- Slash-style dates (`yyyy/mm/dd`) are now excluded alongside hyphen-style dates by the `Exclude Hyphenated` toggle.
- Underscore-separated numeric literals like `12345_6789` (Python-style) are always left untouched regardless of the selected separator.
- Leading-zero integer tokens (`01234`, `007`, `01234567`) are left untouched — these are likely ZIP codes or account IDs, not numeric values.
- Partial-grouping / underscore guards use backtrack-safe `\d*`-padded lookbehind / lookahead, so greedy `\d+` cannot dodge them.
- Bumped declared `@raycast/api` range to `^1.104.0` to reflect the version actually exercised in tests.
