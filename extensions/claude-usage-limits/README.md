# Claude Usage Limits

See the usage limits of every AI agent you've connected to Brim, plus tokens and cost, in Raycast. Type `cc` to open it.

Usage Limits comes first. Each agent gets its own subheading with its limits, reset times and an estimate of where you'll end up. To change the order, use **Move Agent Up** or **Move Agent Down** in the actions menu.

## Setup

Limits come from [Brim](https://github.com/tapariapurv/brim), a free Mac menu bar app, so install it and sign in there. The extension makes no calls to Anthropic and needs no Keychain access, so it can't use up your rate limit.

The Today, This Week, This Month, Sessions, Cost and Model sections use the [ccusage](https://github.com/ryoppippi/ccusage) CLI through `npx`, which needs Node.js. They combine every agent ccusage finds on your Mac. The menu bar and AI tools show Claude limits only.

## Credits

A fork of [ccusage for Raycast](https://github.com/raycast/extensions/tree/main/extensions/ccusage) by nyatinte and contributors (MIT). Not affiliated with Anthropic.
