# Claude Usage Limits

See your Claude Code limits, reset times, tokens and cost in Raycast. Type `cc` to open it.

Usage Limits comes first. It shows your 5-hour, 7-day and per-model limits with an estimate of where you'll end up.

## Setup

Limits come from [Brim](https://github.com/tapariapurv/brim), a free Mac menu bar app, so install it and sign in there. The extension makes no calls to Anthropic and needs no Keychain access, so it can't use up your rate limit.

The Today, This Week, This Month, Sessions, Cost and Model sections use the [ccusage](https://github.com/ryoppippi/ccusage) CLI through `npx`, which needs Node.js.

## Credits

A fork of [ccusage for Raycast](https://github.com/raycast/extensions/tree/main/extensions/ccusage) by nyatinte and contributors (MIT). Not affiliated with Anthropic.
