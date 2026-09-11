# Ultrahuman Insights

> Smart insights, AI tools, and trend charts for your Ultrahuman Ring AIR. Native Raycast UI throughout — menu bar score, split-pane lists with `Detail.Metadata` rails, inline SVG trend charts, and three Raycast AI tools.

> **Sibling to the existing `ultrahuman` extension by @joshmillgate.** That one focuses on raw summary views; this one focuses on per-metric insights, smart copy, charts, and Raycast AI integration. Pick whichever fits your workflow — they can coexist.

## ⚠️ Requirements

This extension uses the **Ultrahuman Partner API**, which is **whitelist-only**. You need:

1. An Ultrahuman Ring AIR (the M1 CGM is optional — glucose metrics will populate if you wear one)
2. **A Partner API token** — apply at [partner.ultrahuman.com](https://partner.ultrahuman.com). Approval is at Ultrahuman's discretion and can take several days. Consumer accounts do **not** automatically have API access.

If you don't have Partner API access, this extension won't work. Please confirm you can access partner.ultrahuman.com before installing.

## Features

- **Menu bar (macOS only)** — Last night's sleep score in your menu bar, color-coded (green/yellow/red) by status. Click for a Sleep + Recovery breakdown.
- **Today's Health** — Every available metric (HRV, RHR, Recovery, Movement, Sleep stages, VO₂ Max, SpO₂, steps, and more) with smart insights, 7-day deltas, and inline charts.
- **Sleep Detail** — Last night's score, ASCII stages bar, vitals during sleep (HRV, temp, RHR), quality breakdown, and 7-day score trend.
- **HRV & Heart Rate** — Today's HRV and Night RHR with 7-day charts, daily values table, and trend deltas.
- **Recovery & Movement** — Three composite indices with one-line insights and individual trend charts.
- **7-Day Trends** — Sparkline overview of every metric; drill into any one for daily values.
- **Raycast AI** — Three AI tools (`get-today`, `get-metric`, `get-trend`) for natural-language queries like "how did I sleep last night" or "is my HRV trending down this week".

## Setup

1. Get a Partner API token from [partner.ultrahuman.com](https://partner.ultrahuman.com).
2. Install this extension.
3. On first launch, Raycast will prompt you for your API token. Paste the JWT.
   - Don't paste the Access Code from the Ultrahuman portal — that's for token rotation only; the extension only uses the JWT.

## Insights

The extension interprets metrics using well-established consumer-wearable thresholds:

- Sleep score, Recovery & Movement indices: ≥85 excellent / 70–84 good / 50–69 fair / <50 poor
- HRV: compared to your personal 7-day baseline (±15%)
- Night RHR: <60 athletic / 60–69 healthy / 70–79 slightly elevated / ≥80 elevated
- VO₂ Max thresholds assume a ~25-year-old; treat as approximate if your age/sex differ significantly.

## Caching & Refresh

- All API access goes through a 5-minute TTL cache, so multiple commands within 5 minutes share one network call.
- Data refreshes every 5 minutes in the background (macOS menu bar).
- `⌘R` in any view forces a fresh fetch.
- On network failure, the extension falls back to the last successful response (up to 24 hours old) with a "cached" indicator.

## Privacy

- Your API token is stored in Raycast's encrypted preferences and is never logged, sent to third parties, or written to disk in plaintext.
- All API calls go directly to `partner.ultrahuman.com`. No analytics, telemetry, or third-party services are used.

## Platforms

- **macOS** — All commands, including the menu bar sleep score.
- **Windows** — View commands and Raycast AI tools. The menu bar command is macOS-only.

## Limitations

- **Ring AIR only** for now — Ultrahuman's Cyborg / M1 CGM glucose metrics are read but the UI sections will be empty unless you have a CGM.
- VO₂ Max thresholds are approximate (see Insights above).
- Range queries are capped at 7 days by the Ultrahuman API; this is reflected in the Trends and HRV views.

## Author

Built by [Aryan Rustagi](https://github.com/ary4n).
