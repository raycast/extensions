# Codex Reset Forecast

See the estimated chance of a shared Codex quota reset within **24 hours** and
**48 hours**, model confidence, and the latest reset notice.
Data: [codex-reset.com](https://codex-reset.com/).

## In Raycast

**Check Reset Forecast** opens the current outlook and searchable reset history.
The outlook shows both probabilities, the provider's confidence, the last
global reset, and whether an official watch is active. **Last Global Reset** combines
the elapsed time with the provider's notice when both refer to the same reset.
Watches and notices about a different event appear separately. Notice text and
source information come from codex-reset.com.

Select a history record to read its summary, record source, and original source.
The timeline follows the website's **Reset**, **Note**, and **Banked** categories,
with banked statuses such as **Announced**, **Arriving**, **Available**, or **Update**.
Filter to resets, notes, or banked grants and updates.
Banked grants do not advance the last-reset clock. Separate source records are
preserved even when they describe the same reset. The main timeline uses your
system time zone; the calendar and its records use the source's UTC dates.
Forecasts are experimental estimates, not guarantees or your personal quota timer.

**View Reset Calendar** displays the current and previous month, with the current
month selected initially. Green circles mark reset days; orange squares mark
banked updates. A day with both shows both markers. Each category counts a day
once, even when it has several source records; banked updates do not add to the
reset-day count. Future dates are dimmed. Press Return on a month to browse its
reset and banked records. The calendar starts on Monday and follows the UTC
dates published by codex-reset.com.

**Show Reset Forecast in Menu Bar** displays one of:

- **Reset Likelihood (24 Hours)** — for example, `21% · 24h`.
- **Reset Likelihood (48 Hours)** — for example, `37% · 48h`.
- **Time Since Last Reset** — for example, `5h`.

Use **Menu Bar Settings…** in its dropdown to choose the display. The dropdown
includes both probabilities, the last global reset, recent reset records,
and links to the outlook, calendar, and data source.
**Hide from Menu Bar** keeps it hidden until you run the command again.

Use **Refresh Now** or **⌘R** to refresh. Refreshes within one minute reuse saved
data to respect the provider's request limit; rate-limit responses can extend
that wait. Raycast can also refresh approximately every 30 minutes when its
native background refresh is enabled.

## Data and Privacy

The extension reads the public [`/api/forecast`](https://codex-reset.com/api/forecast)
and [`/api/timeline`](https://codex-reset.com/api/timeline) endpoints. It sends an
identifying User-Agent naming this project and its public GitHub repository,
as required by the provider's [API terms](https://codex-reset.com/developers).
It does not send account credentials, personal usage, or analytics.

The last complete, validated forecast and timeline are saved locally. A failed
refresh retains those data and their original **Last Checked** time and shows a
failure toast. With no saved data, an error view offers refresh and the source
website. The provider's publication expiry is used to flag overdue data.
Snapshots from the previous data provider are not reused under the new source.

Data: [codex-reset.com](https://codex-reset.com/). Source links and attribution
are included in the views and copied summaries. The extension displays the
provider's classifications and probabilities; it does not compute predictions.

Unofficial and not affiliated with OpenAI or codex-reset.com.
