<p align="center">
  <img src="assets/subscription-icon.png" width="80" alt="Subscription Manager Icon" />
  <h1 align="center">Subscription Manager</h1>
  <p align="center">Track and manage all your recurring subscriptions in one place — right from Raycast.</p>
</p>

## Features

- **Calendar View** — See all your billing dates laid out on a monthly grid. Navigate months with arrow keys.
- **All Subscriptions** — Browse, filter by category, and sort by name, amount, billing day, or category.
- **Subscription Detail** — View full details, edit, pause/resume, or delete. Navigate between subscriptions with `←` / `→`.
- **Add Subscription** — Quickly add a new subscription with preset services (Netflix, Spotify, Claude, etc.), auto-filled icons and categories.
- **Analytics** — Monthly spend breakdown by category, billing cycle, or list. Top expenses, month-over-month comparison, and yearly forecast.
- **Export** — Back up your subscriptions as JSON or CSV, or export the analytics report as Markdown. Save to Downloads or copy to the clipboard (`⌘⇧E`).
- **Menubar** — Monthly total and upcoming bills at a glance. Shows due today, next 7 days, or full month view.
- **Notifications** — Get reminded before a subscription bills. Set up to two reminders with custom timing. Fires within 5 minutes of the set time (e.g. 9:00 may notify at 9:05). _(macOS only — uses AppleScript, not available on Windows)_

## Commands

| Command                    | Description                                                |
| -------------------------- | ---------------------------------------------------------- |
| Manage Subscription        | Calendar view with monthly billing overview                |
| All Subscriptions          | List view with filter and sort                             |
| Add Subscription           | Form to add a new subscription                             |
| Subscription Analytics     | Spending breakdown and insights                            |
| Subscriptions Menubar      | Menubar item with totals and upcoming bills                |
| Subscription Notifications | Background reminder engine (runs every 5 min) — macOS only |

## Preferences

### Extension-level

- **Primary Currency** — Base currency for totals and analytics (INR, USD, EUR, GBP, and 19 more)
- **Rounding** — Hide decimal places in currency display
- **Abbreviated Numbers** — Show compact format like ₹99.9K
- **First / Second Reminder** — Days before billing to notify (same day, 1, 3, or 7 days before), with custom notification time

### Menubar-level

- **Show Monthly Total** — Display beside the icon or inside the dropdown
- **Show in Menu** — Full month, upcoming only, or minimal view

## Supported Currencies

INR · USD · EUR · GBP · JPY · AUD · CAD · SGD · BRL · CHF · CNY · HKD · IDR · KRW · MXN · MYR · NOK · NZD · PHP · SEK · THB · TRY · ZAR

## Billing Cycles

Monthly · Yearly · Quarterly · Half-yearly · Weekly

## Credits

- [Dmytro Chuta (@dmitriychuta)](https://x.com/dmitriychuta) — his macOS app **Subscription Day** inspired this extension
- [Dhruv Suthar (@0xdhrv)](https://x.com/0xdhrv) — suggested the background `interval` approach for notifications and the Simple Reminder extension as a reference
- [Frankfurter](https://www.frankfurter.app) — open-source exchange rate API (powered by the European Central Bank) used for multi-currency totals
