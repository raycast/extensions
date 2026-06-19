# CoveCast — Raycast Extension Design

**Date:** 2026-06-19
**Status:** Approved

## Goal

A Raycast extension ("CoveCast", command `buy`, mode `view`) that lets you copy a
token contract address from anywhere, hit a hotkey, auto-detect the chain, pick a USD
buy amount, and open the matching **Cove** Telegram bot deeplink.

## Key decision: real Cove protocol, not generic templates

The original prompt described a generic `{ca}-{amount}-{chain}` string-substitution
template "since only I know Cove's format." The attached PDF and
`docs.cove.trade/builders/deep-links` give the **actual** protocol, so we implement that
natively (links that genuinely work in `cove_trading_bot`):

- Bot handle: **`cove_trading_bot`**, base URL `https://t.me/cove_trading_bot?start={payload}`.
- Telegram limits the `/start` payload to **64 chars**.
- Link types:
  - `g_{amount}{chainCode}{base62Token}[{COVE_TAIL}]` — immediate buy.
  - `b_{chainCode}{base62Token}[{COVE_TAIL}]` — opens market panel.
- Base62 alphabet: `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`,
  left-padded with `0` to a fixed width.
- Token encoding: EVM = strip `0x`, hex-decode to 20 bytes → **27** base62 chars.
  Solana = base58-decode to 32 bytes → **43** base62 chars.
- Amount = **USD** value, `d` replaces the decimal point, field is 1–4 chars
  (`$10`→`10`, `$0.50`→`0d5`, `$0.05`→`0d05`, max `9999`).
- Chain codes: `e`=ethereum, `b`=base, `n`=bnb(bsc), `m`=megaeth, `s`=solana
  (also tempo `t`, monad `o`, story `y`, hyperevm `h`, plasma `p`).
- Cove tail: a fixed 14-char suffix on every link — a 7-char base62 Telegram id plus the
  `0000000` group sentinel (Telegram IDs strip the `-100` group prefix, then base62 → 7 chars).

### Approved choices

- **Build:** real Cove base62 protocol (with an optional `customLinkTemplate` escape hatch).
- **Primary action:** `g_` immediate buy; `b_` market panel always available as a
  secondary action and as the no-amount fallback. `defaultBuyAction` pref can flip primary to `b_`.
- **Amounts:** USD, default `25,50,100,500`.
- **Cove tail:** a fixed `COVE_TAIL` baked into every link.

### Deviations from the literal prompt (required by the real protocol)

- Generic `{ca}` templates replaced by native base62 building (custom-template override kept).
- `arbitrum` dropped from default `supportedChains` — Cove has no chain code for it.

## File layout

```
cove-cast/
├── package.json              # Raycast manifest + preferences + scripts/deps
├── tsconfig.json             # strict
├── README.md
├── assets/command-icon.png   # 512×512 (custom artwork)
└── src/
    ├── buy.tsx               # the "buy" view command (UI + flow)
    ├── cove.ts               # protocol: base62/base58, chain codes, amount encode, build g_/b_
    ├── detect.ts             # clipboard extraction + Dexscreener chain detection
    ├── preferences.ts        # typed preference reading + safe CSV/JSON parsing
    └── __tests__/
        ├── cove.test.ts
        └── detect.test.ts
```

## Modules

### `cove.ts`

- `bytesToBase62(bytes, width)` / `base62ToBytes(str, byteLength)` — per PDF pseudocode (BigInt).
- `base58Decode(str)` — inline, no dependency (Solana → 32 bytes). `hexToBytes` for EVM (20 bytes).
- `encodeToken(ca, type)` — EVM 27 / Solana 43 chars; throws on malformed input.
- `encodeUsdAmount(n)` — `25`→`"25"`, `0.5`→`"0d5"`, `0.05`→`"0d05"`; validates ≤4 chars & `0 < n ≤ 9999`.
- `COVE_CHAIN_CODES: Record<dexscreenerChainId, coveCode>` merged with optional `chainCodeOverrides`.
- `buildDeeplink({ kind, chainId, ca, type, amount?, botUsername })` — assembles payload,
  appends the fixed `COVE_TAIL`, validates final `/start` ≤ 64 chars.
- Optional `customLinkTemplate` override (advanced): `{base62Token}`,`{coveAmount}`,`{chainCode}`,`{ca}`,
  `{amount}`,`{chain}`,`{botUsername}`; if it lacks an amount placeholder the amount picker is skipped.

### `detect.ts`

- `extractContractAddress(text)` — EVM regex `/0x[a-fA-F0-9]{40}/` first (deterministic EVM preference),
  else Solana `/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/`; returns `{ ca, type } | null`.
- `parseDexscreenerTokens(json)` — pure: distinct `chainId`s, token `symbol`/`name`, summed
  `liquidity.usd` per chain, sorted desc (unit-testable).
- `detectChains(ca, signal)` — `GET .../latest/dex/tokens/{ca}` with a 3s `AbortController`.

### `buy.tsx`

State machine in one `<List>`:

1. Mount → read clipboard → extract CA. None → `List.EmptyView`.
2. Detect chain (`isLoading` while fetching). Intersect detected ∩ `supportedChains` ∩ has-Cove-code.
   1 match → auto-select; multiple → `autoPickHighestLiquidity` or chain-picker rows
   (chain + symbol + liquidity); fail/timeout/empty → `defaultChain`.
3. Amounts list, section header = `chain + token symbol`. Row primary = `g_` open + toast
   (`Buying $25 base → 0x12…ab`); secondaries = `Open Buy Panel (b_)`, `Copy Deeplink`,
   `Copy Contract Address`, `Switch Chain`.

## Preferences (package.json)

`botUsername` (`cove_trading_bot`), `supportedChains` (`ethereum,base,bsc,solana`),
`defaultChain` (`base`), `amounts` (`25,50,100,500`), `amountsByChain` (optional JSON),
`defaultBuyAction` (`g_`/`b_`, default `g_`),
`autoPickHighestLiquidity` (false), advanced `chainCodeOverrides` (JSON), `customLinkTemplate`.
All CSV/JSON parsed in try/catch with safe fallbacks.

## Errors / edges

- EVM + Solana both present → EVM.
- All detected chains unsupported → `defaultChain`, or error EmptyView if it has no code.
- Invalid amount (encode > 4 chars / out of range) → skip row + toast.
- Decode failure or payload > 64 chars → toast, do not open.
- Preference JSON/CSV parse failures → safe fallback to defaults.

## Tooling & tests

- `npm install && npm run dev` → `ray develop`. `npm test` → vitest over pure modules.
- Tests: base62/base58 round-trips, EVM 27-char & Solana 43-char encodes, amount encoding,
  `g_`/`b_` assembly checked against the PDF examples, ≤64-char limit, address extraction.
- Icon: 512×512 PNG at `assets/command-icon.png` (custom artwork), verified by `ray lint`.

## Addendum (2026-06-19): Quick Buy command

A second, no-UI command for one-keystroke sniping.

- **Command:** `quick-buy`, `mode: "no-view"`, titled "Quick Buy" (hotkeyable). Fires and shows
  a HUD; renders no window.
- **New preference:** `quickBuyAmount` (USD, default `25`). Reuses the existing
  `defaultBuyAction` and chain detection — no other new knobs.
- **Flow:** read clipboard → `extractContractAddress` → resolve chain **deterministically**
  (no picker in a no-view command) → `buildCoveLink` with `defaultBuyAction` + `quickBuyAmount`
  → `open()` → `showHUD`. Errors surface as HUD messages.
- **Deterministic chain resolution:** Solana → `solana`; EVM → highest-liquidity supported
  chain, else `defaultChain`, else HUD error. With `defaultBuyAction = b_`, the amount is
  omitted and the buy panel opens for the token.
- **Shared logic:** the chain-decision logic moves out of `buy.tsx` into a pure, unit-tested
  `src/resolve.ts` — `resolveChains(config, extracted, tokenInfo)` returns a structured decision
  (`ready` / `pick` / `fallback` / `none` + sorted candidates). `buy.tsx` maps it to its UI
  state (behavior unchanged); `quick-buy` auto-picks the top candidate.
- **Tests:** `resolveChains` (ready / multi-pick / default-fallback / none / solana) and
  `quickBuyAmount` normalization. The no-view glue (clipboard/open/HUD) is verified by
  `ray build` + manual run.

## Addendum (2026-06-19): open Telegram directly

`https://t.me/…` links open the browser first (which then redirects into Telegram). Telegram's
native scheme opens the app directly:

```
tg://resolve?domain={botUsername}&start={payload}
```

- **New preference `linkTarget`** (dropdown): _Telegram app (`tg://`)_ default, _Browser
  (`https`)_ fallback (`tg://` silently no-ops without Telegram installed).
- `cove.ts` gains `buildTgDeeplink(opts)`; `buildCoveLink` takes an optional `target` and picks
  the scheme (`https` default, so `Copy Deeplink` stays the shareable `t.me` link).
- Both commands' `open()` use `config.linkTarget`. A `customLinkTemplate` controls its own scheme.

## Addendum (2026-06-19): fixed Cove tail

Every link carries a fixed `COVE_TAIL` (a 7-char base62 Telegram id + `0000000` group sentinel),
baked into the build rather than configured.

- **Removed** the editable preference and the `Config` / `BuildOptions` plumbing for it.
- **Added** `COVE_TAIL = encodeTelegramId("876274588") + "0000000"` in `cove.ts`; `buildPayload`
  always appends it, so every `g_`/`b_` link ends with the tail. The Solana `g_` worst case is
  still exactly 64 chars.

## Addendum (2026-06-19): strip advanced preferences

Removed four user-facing knobs (and their now-dead code) to keep the end-user settings minimal:

- **`linkTarget`** → gone; both commands always open `tg://` (Telegram app). `Copy Deeplink`
  still produces the shareable `https` link.
- **`autoPickHighestLiquidity`** → gone; the Buy view always shows the chain picker when
  multiple supported chains match. (Quick Buy still auto-picks the top candidate — it has no UI.)
- **`chainCodeOverrides`** → gone; `coveChainCode` is called with no overrides (built-in map only).
  The pure `coveChainCode(chainId, overrides?)` keeps its optional param for tests/reuse.
- **`customLinkTemplate`** → feature removed entirely (`renderTemplate`, `templateHasAmount`,
  `TemplateContext` deleted from `cove.ts`; `buildCoveLink` is native-only).

Remaining preferences: `botUsername`, `supportedChains`, `defaultChain`, `amounts`,
`amountsByChain`, `quickBuyAmount`, `defaultBuyAction`.

## Addendum (2026-06-19): hardcode bot + chains, drop default chain

Further trimmed the end-user settings:

- **`botUsername`** → gone; hardcoded `COVE_BOT_USERNAME = "cove_trading_bot"` constant.
- **`supportedChains`** → gone; a chain is "supported" iff Cove has a chain code for it, i.e. all
  **10** Cove networks (per docs: ethereum, base, bnb/`bsc`, megaeth, solana, tempo, monad, story,
  hyperevm, plasma — already in `COVE_CHAIN_CODES`).
- **`defaultChain`** → gone; detection alone decides. `resolveChains(extracted, info)` now drops
  its `config` param and its `fallback` kind — when no Cove-supported chain is detected it returns
  `none`, which the Buy view shows as an error and Quick Buy reports via HUD (no silent default).

Remaining preferences: `amounts`, `amountsByChain`, `quickBuyAmount`, `defaultBuyAction`.

Tradeoff: a Dexscreener timeout/outage now yields "no chain detected" instead of defaulting to
`base`. Acceptable per the request ("default chain is whatever the search picks up").

## Addendum (2026-06-19): drop per-chain amounts

Removed the `amountsByChain` preference and the `amountsForChain` helper (and the now-unused
`parseJsonMap`). The amount list is always the single global `amounts`.

Final preferences: `amounts`, `quickBuyAmount`, `defaultBuyAction`. The display name is **CoveCast**
(one word); the icon is custom 512×512 artwork (the procedural `generate-icon` script was removed).
