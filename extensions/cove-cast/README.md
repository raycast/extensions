# CoveCast

A Raycast extension for one-keystroke buys through the [Cove](https://docs.cove.trade)
Telegram bot. Copy a token contract address **anywhere** (Telegram, Discord, a browser),
hit your hotkey, and CoveCast will:

1. Read the contract address off your clipboard,
2. Auto-detect which chain it lives on (via Dexscreener),
3. Let you pick a USD amount, and
4. Open the matching Cove deeplink — `g_` for an immediate buy, `b_` for the buy panel.

The deeplinks are built using Cove's real
[base62 deep-link protocol](https://docs.cove.trade/builders/deep-links), so they work
directly in `@cove_trading_bot`.

Two commands:

- **Buy** — opens a list, you pick the amount; the chain is auto-detected.
- **Quick Buy** — no UI: fires your configured **Quick Buy Amount** in one keystroke. The
  fastest snipe. See [Quick Buy](#quick-buy-one-keystroke) below.

## Quick start

```bash
npm install
npm run dev      # imports the extension into Raycast in development mode
```

Then, in Raycast, search for **Buy** (or **Quick Buy**) and assign it a global hotkey
(Raycast → Extensions → CoveCast → the command → Record Hotkey). Copy a contract address,
press the hotkey, and go.

## How it works

### 1. Clipboard extraction

The first contract address in the clipboard text is extracted, even from noisy strings like
`CA: 0xabc… 🚀`:

- **EVM:** `/0x[a-fA-F0-9]{40}/`
- **Solana:** `/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/` (base58, excludes `0 O I l`)

If both an EVM and a Solana address are present, **EVM wins** (deterministic). If none is
found, you get an empty view telling you to copy a CA first.

### 2. Chain detection (Dexscreener)

- A **Solana** address is unambiguous → chain is `solana`.
- An **EVM** address could be Base, Ethereum, BSC, etc. — the address alone can't tell you —
  so CoveCast calls
  `GET https://api.dexscreener.com/latest/dex/tokens/{ca}` (with a ~3s timeout) and:
  - collects the distinct `chainId`s the token trades on,
  - reads the token symbol/name,
  - sums `liquidity.usd` per chain and sorts chains by liquidity.

A chain counts as supported when Cove has a chain code for it — all **10 Cove networks**
(ethereum, base, bnb/`bsc`, megaeth, solana, tempo, monad, story, hyperevm, plasma). There is no
configured allow-list and no fallback default chain; detection alone decides:

| Result                                              | Behavior                                          |
| --------------------------------------------------- | ------------------------------------------------- |
| One or more Cove-supported chains detected          | The highest-liquidity one is auto-selected        |
| No Cove-supported chain detected (or lookup failed) | Error — the token isn't buyable on Cove right now |

(Detection for the newer chains depends on Dexscreener using the same chainId as the built-in
map; the major chains — ethereum/base/bsc/solana — are exact.)

### 3. Buy

Each amount is a row. The primary action (Enter) fires the Cove deeplink and shows a toast
(e.g. `Buying $25 base → 0xA0b8…eB48`). Secondary actions: **Open Buy Panel**, **Copy
Deeplink** (`⌘C`), and **Copy Contract Address**.

> ⚠️ The `g_` (immediate buy) link **executes the purchase without an in-Telegram confirmation**
> for onboarded users. If you'd rather always confirm in Cove's UI, set **Default Buy Action**
> to _Market panel_, or just use the **Open Buy Panel** action.

## Quick Buy (one keystroke)

The **Quick Buy** command has no UI — assign it its own hotkey and it's a true one-press snipe:
copy a CA → hotkey → it reads the clipboard, resolves the chain, fires your **Quick Buy Amount**,
and shows a HUD (e.g. `Cove: buying $25 base → 0xA0b8…eB48`).

Chain resolution is the same as **Buy** and fully deterministic: Solana → `solana`;
EVM → the **highest-liquidity Cove chain detected**, or a HUD error if none is found. It reuses
your **Default Buy Action**. With Default Buy Action set to _Market panel_, Quick Buy just opens
the buy panel for the token (the amount is ignored).

> ⚠️ With Default Buy Action = `g_`, Quick Buy is a one-keystroke **real** buy with no
> confirmation. Keep **Quick Buy Amount** small while you test, and confirm the HUD reports what
> you expected.

## Preferences

All editable in Raycast → Extensions → CoveCast.

| Preference                 | Default         | Description                                                                        |
| -------------------------- | --------------- | ---------------------------------------------------------------------------------- |
| **Buy Amounts (USD)**      | `25,50,100,500` | Comma list of USD amounts. Decimals allowed (e.g. `0.5`).                          |
| **Quick Buy Amount (USD)** | `25`            | The USD amount the **Quick Buy** command fires in one keystroke. Decimals allowed. |
| **Default Buy Action**     | Immediate buy   | _Immediate buy_ (instant) or _Market panel_ (opens Cove's buy panel to confirm).   |

The bot handle (`cove_trading_bot`) and the supported-chain set (all 10 Cove networks) are baked
into the code, not preferences. Invalid entries in the amount lists are ignored.

## Development

```bash
npm run dev          # ray develop — live-reload into Raycast
npm test             # vitest — unit tests for the encoding/detection logic
npm run build        # ray build — type-check + bundle
npm run lint         # ray lint (ESLint + Prettier + manifest validation)
```

The pure logic (base62/base58, USD-amount encoding, deeplink assembly, address extraction,
Dexscreener parsing, preference normalization) lives in `src/cove.ts`, `src/detect.ts`,
`src/preferences.ts`, and `src/link.ts` and is covered by tests in `src/__tests__/`. The
Raycast view (`src/buy.tsx`) is verified by `ray build`.

## License

MIT. Contributions welcome — fork it, open a PR.
