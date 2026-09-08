# LiteLLM for Raycast

Track your [LiteLLM](https://docs.litellm.ai/) proxy usage without leaving Raycast.

## Commands

- **Today's Spend** — a menu bar item showing your `$` spent today, with a per-model
  breakdown and quick links. Refreshes every 15 minutes.
- **Usage** — a list of your spend / tokens / requests for **Today**, the **last 7 days**,
  and the **last 30 days**, plus your remaining budget and a per-model breakdown.

All figures are scoped to the virtual key you authenticate with — you only see your own usage.

## Authentication

The extension talks to your LiteLLM proxy using two things you enter in the command
preferences the first time you run a command:

### 1. Base URL

The URL of your LiteLLM proxy, e.g. `https://llm.example.com` (no trailing `/`). This is the
same host you point the OpenAI SDK at. Ask your LiteLLM admin if you're unsure.

### 2. Virtual Key

A LiteLLM **virtual key** (starts with `sk-`). Get one by either:

- Opening your LiteLLM dashboard (`<Base URL>/ui`) → **Virtual Keys** → **Create New Key**, or
- Asking an admin to mint one for you (`POST /key/generate`).

A regular, non-admin virtual key is enough — the extension only reads your own usage via the
`/user/daily/activity` route.

> Your key is stored securely in Raycast preferences (as a password field) and is only sent to
> the Base URL you configure.

### Optional: Monthly Budget

Set **Monthly Budget** (USD) to see how much of your budget you've used this month. This is a
value you enter yourself in preferences — the extension does not read any budget from your key.
The menu bar title then shows today's spend plus the month-to-date percentage (e.g.
`🚅 $2.10 · 45%`), and both the menu bar dropdown and the Usage command show `spent / budget · %`.
Leave it empty to hide the percentage — no budget is set by default.

## Setup

1. Install the extension.
2. Run **Today's Spend** or **Usage** — Raycast will prompt for the Base URL and Virtual Key.
3. Paste both values. Usage should appear immediately.

You can change these later via **Configure Extension** (`⌘ ,` on any command) or the extension's
preferences in Raycast.

## Troubleshooting

- **"Unauthorized"** — double-check the Virtual Key and that the Base URL matches your proxy.
- **"Could not reach …"** — verify the Base URL is reachable from your machine.
- **No budget percentage** — set the optional **Monthly Budget** preference to show month-to-date %.
