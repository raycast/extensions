# Bouncer Deliverability Changelog

## [Domain Checks, AI Tools, and a Rebuilt Result View] - 2026-08-05

- Check a domain's mail setup from the same command — type a bare domain and Bouncer reports its MX record, catch-all, disposable, free, and toxic status, plus the mail provider.
- Fixed the mailbox signals, which previously always read "Not reported". Bouncer returns them as `yes`/`no`/`unknown` strings rather than booleans.
- Added the `risky` verdict. Catch-all and full-mailbox addresses were previously collapsed into "Unknown".
- Added a send, hold, or suppress recommendation for every result, based on Bouncer's integration guidelines.
- Surfaced the account signals (role, disabled, full mailbox), toxicity, DNS record, and "did you mean" typo suggestions, which can be verified in one keystroke.
- Signals are now coloured by what they mean for that verdict, and only the ones worth acting on are shown.
- Added Raycast AI tools for email verification, domain checks, and the credit balance.
- Added a command argument and fallback-command support, and the address is prefilled from your selection or clipboard.
- Added local history of the last 50 results, filterable by verdict and rankable by frecency, so results can be reopened without spending another credit. Recording can be switched off in preferences.
- Show the remaining credit balance, and handle expired keys, rate limits, and empty balances with actionable errors.
- Requests now time out instead of hanging, and a second check cancels the one in flight.
- New icon.

## [Initial Release] - 2026-06-24

- Verify email deliverability with the Bouncer API.
- Show verdict, score, provider, domain, reason, and mailbox signals.
- Store the Bouncer API key as a secure Raycast password preference.
