# CoveCast

One-keystroke buys through the [Cove](https://docs.cove.trade) Telegram bot. Copy a token
contract address **anywhere** (Telegram, Discord, a browser), hit your hotkey, and CoveCast will:

1. Read the contract address off your clipboard,
2. Auto-detect which chain it lives on (via Dexscreener),
3. Let you pick a USD amount, and
4. Open the matching Cove deeplink — `g_` for an immediate buy, `b_` for the buy panel.

The deeplinks are built using Cove's real
[base62 deep-link protocol](https://docs.cove.trade/builders/deep-links), so they work directly
in `cove_trading_bot`.

## Commands

- **Buy** — opens a list, you pick the amount; the chain is auto-detected.
- **Quick Buy** — no UI: fires your configured **Quick Buy Amount** in one keystroke, after a
  single confirmation for immediate buys. The fastest snipe.

> ⚠️ Both commands can execute a **real, irreversible on-chain purchase**. An immediate buy
> (`g_`) always asks for one confirmation before it fires. If you'd rather always confirm inside
> Cove's own UI instead, set **Default Buy Action** to _Market panel_, or use the **Open Buy
> Panel** action.

## How it works

### 1. Clipboard extraction

The first contract address in the clipboard text is extracted, even from noisy strings like
`CA: 0xabc… 🚀`:

- **EVM:** `/0x[a-fA-F0-9]{40}/`
- **Solana:** `/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/` (base58, excludes `0 O I l`)

If both an EVM and a Solana address are present, **EVM wins** (deterministic). If none is found,
you get an empty view telling you to copy a CA first.

### 2. Chain detection (Dexscreener)

- A **Solana** address is unambiguous → chain is `solana`.
- An **EVM** address could be Base, Ethereum, BSC, etc. — the address alone can't tell you — so
  CoveCast calls `GET https://api.dexscreener.com/latest/dex/tokens/{ca}` (with a ~3s timeout)
  and:
  - collects the distinct `chainId`s the token trades on,
  - reads the token symbol/name,
  - sums `liquidity.usd` per chain and sorts chains by liquidity.

A chain counts as supported when Cove has a chain code for it — all **11 Cove networks**
(Ethereum, Base, BNB Chain, MegaETH, Solana, Tempo, Monad, Story, HyperEVM, Plasma, Robinhood).
There is no configured allow-list and no fallback default chain; detection alone decides:

| Result                                              | Behavior                                          |
| --------------------------------------------------- | ------------------------------------------------- |
| One or more Cove-supported chains detected          | The highest-liquidity one is auto-selected        |
| No Cove-supported chain detected (or lookup failed) | Error — the token isn't buyable on Cove right now |

(Detection for the newer chains depends on Dexscreener using the same chainId as the built-in
map; the major chains — Ethereum/Base/BNB Chain/Solana — are exact.)

### 3. Buy

Each amount is a row. The primary action (Enter) confirms, fires the Cove deeplink, and shows a
toast confirming the link was opened. Secondary actions: **Open Buy Panel**, **Copy Deeplink**
(`⌘⇧C`), and **Copy Contract Address**.

## Preferences

All editable in Raycast → Extensions → CoveCast.

| Preference                 | Default         | Description                                                                        |
| -------------------------- | --------------- | ---------------------------------------------------------------------------------- |
| **Buy Amounts (USD)**      | `25,50,100,500` | Comma list of USD amounts. Decimals allowed (e.g. `0.5`).                          |
| **Quick Buy Amount (USD)** | `25`            | The USD amount the **Quick Buy** command fires in one keystroke. Decimals allowed. |
| **Default Buy Action**     | Immediate buy   | _Immediate buy_ (instant, confirmed) or _Market panel_ (opens Cove's buy panel).   |

The bot handle (`cove_trading_bot`) and the supported-chain set (all 11 Cove networks) are baked
into the code, not preferences. Invalid entries in the amount lists are ignored.

## License

MIT.
