# Sports Odds

Search live sports odds, compare the best available lines across 30+ sportsbooks, and run the betting math that matters (Kelly stake sizing, hedging, de-vig edge checks, free bet conversion) without leaving Raycast.

Powered by [ParlayAPI](https://parlay-api.com), a real-time sports odds API.

## Commands

### Search Odds

Type a team name to find upcoming matchups across MLB, NBA, NFL, NHL, soccer, MMA, tennis, and more. Select a game to see the best available moneyline on each side and a book-by-book comparison, so you always know which sportsbook is posting the strongest price.

### Line Calculators

Four calculators backed by ParlayAPI's calc endpoints:

- **Kelly Stake Sizing**: recommended stake from bankroll, odds, and your win probability, with quarter, half, and full Kelly options
- **Hedge Calculator**: how much to stake on the other side to lock in equal profit or a free roll, with arbitrage detection
- **De-Vig Edge Check**: strips the vig from a sharp two-sided market (or uses your own probability) to tell you if your price is +EV
- **Free Bet Converter**: how to hedge a free bet into guaranteed cash and what conversion rate you are getting

All odds inputs accept American (-110, +250) or decimal (1.91) formats.

## Setup

No setup required. Both commands work out of the box with ParlayAPI's keyless public endpoints (live search, live best-line consensus, and calculators).

### Optional: full odds boards

Add a ParlayAPI key in the extension preferences to unlock the full pre-game odds board for any game: moneyline, spreads, and totals from every tracked bookmaker.

The free tier includes 1,000 credits per month, no card required: [parlay-api.com/signup](https://parlay-api.com/signup). Paid plans are listed at [parlay-api.com/pricing](https://parlay-api.com/pricing).

## Notes

- Odds data is informational only. This extension does not place bets and is not affiliated with any sportsbook.
- If sports betting is not legal where you live, use the data responsibly. If you or someone you know has a gambling problem, help is available (in the US, call or text 1-800-GAMBLER).
