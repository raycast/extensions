# Codex Reset Forecast

See how likely a shared Codex quota reset is within **24 hours** and **48 hours**,
then browse the evidence behind previous resets. Powered by
[Codex Reset Monitor](https://codexreset.org/).

## In Raycast

**Check Reset Forecast** opens a split view with the current outlook, the latest
confirmed reset, and a searchable history. Select a record to read its original
post, reset details, scope, and source link without leaving the list. Filter the
history to confirmed resets, announcements, or banked resets. Dates and times
use your system time zone.

The extension preserves the site's ledger records. Multiple source records can
refer to the same reset. Banked resets and future announcements do not advance
the last-confirmed-reset clock.

**View Reset Calendar** shows the current and previous month side by side.
The current month is selected when the command opens.
Green circles mark days with a confirmed reset or compensation, and future
dates are dimmed. Each day counts once even when it has multiple source records.
Select a month and press Return to read its records.
The calendar starts on Monday and uses your system time zone. You can also open
it from the forecast's Actions menu or the menu bar.

**Show Reset Forecast in Menu Bar** displays the menu bar indicator. Its command
settings contain all menu bar preferences. Choose **Menu Bar Settings…** in its
dropdown to display one of:

- **Reset Likelihood (24 Hours)** — for example, `24% · 24h`.
- **Reset Likelihood (48 Hours)** — for example, `43% · 48h`.
- **Time Since Last Reset** — for example, `1d`.

The dropdown always includes both forecast horizons, the last reset's exact
time, recent reset records, and a link to the full history. Select either
forecast horizon to open the outlook. Use **Refresh Now**
or **⌘R** to update. Raycast can also refresh the menu bar approximately every
30 minutes when its native background refresh is enabled.
Choose **Hide from Menu Bar** in the dropdown to hide the indicator; background
updates keep it hidden until you run **Show Reset Forecast in Menu Bar** again.

## Data and Privacy

Forecasts, explanations, and reset records come from the public structured
snapshot used by codexreset.org. Probabilities are the source's estimates; the
extension does not calculate predictions or track your personal quota.

The last valid snapshot is saved locally. If a refresh fails, the extension
quietly keeps the existing data and its original **Last Checked** time. The menu
bar icon stays the same. An error appears only when no saved data is available.
Source status messages still explain when a forecast is awaiting reassessment
or some monitored sources did not respond. An unchanged forecast stays current
until the source says otherwise or its scheduled reassessment is due.
No account setup, analytics, or personal data collection is included.

Unofficial and not affiliated with OpenAI or Codex Reset Monitor.
The extension uses the [Codex Reset Monitor icon](https://codexreset.org/codex-reset-icon.png?v=3)
with its exterior white corners made transparent.

## Development

Use Node.js 24 and npm:

```bash
nvm use
npm ci
npm run dev
```

Validate with:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:contract
```

The live contract test requires internet access. It checks the public server
function used by the source website; this endpoint is not a versioned API and
may change when the website is deployed.
