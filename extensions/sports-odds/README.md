# Sports Odds

Search available sports odds, compare returned bookmaker quotes, and run calculators for Kelly stake sizing, hedging, de-vig edge checks and free bet conversion without leaving Raycast.

Powered by [ParlayAPI](https://parlay-api.com), a real-time sports odds API.

## Commands

### Search Odds

Type a team name to search available matchups. Select a returned game to compare its moneyline quotes by bookmaker. Event, market and bookmaker availability varies.

### Line Calculators

Four calculators backed by ParlayAPI's calc endpoints:

- **Kelly Stake Sizing**: calculated stake from bankroll, odds, and your win probability, with quarter, half, and full Kelly options
- **Hedge Calculator**: estimate hedge stakes and outcome profits from supplied odds, with equal-profit and free-roll targets
- **De-Vig Edge Check**: strips the vig from a sharp two-sided market (or uses your own probability) to tell you if your price is +EV
- **Free Bet Converter**: estimate hedge stakes, outcome profits and the conversion rate from supplied odds

All odds inputs accept American (-110, +250) or decimal (1.91) formats. Calculations assume the supplied prices, accepted stakes and matching settlement rules. Fees, limits, voided bets and price changes can affect actual results; profit is not guaranteed.

## Setup

Start with public search previews and calculators without entering an API key. An internet connection is required. Preview availability varies, and requests can return no matching data or an error.

### Optional: full odds boards

Add your own ParlayAPI key in the extension preferences to request available moneyline, spread and total odds. Returned events, markets and bookmakers depend on coverage and account access.

Create a key through [ParlayAPI](https://parlay-api.com/signup). See [current plans and credit allowances](https://parlay-api.com/pricing) before using authenticated requests.

## Notes

- Odds data is informational only. This extension does not place bets and is not affiliated with any sportsbook.
- If sports betting is not legal where you live, use the data responsibly. If you or someone you know has a gambling problem, help is available (in the US, call or text 1-800-GAMBLER).
