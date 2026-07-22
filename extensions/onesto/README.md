# Onesto

Manage your Italian e-invoicing and taxes with [Onesto](https://onesto.it) directly from Raycast: browse unpaid invoices, issue electronic invoices to SDI, keep an eye on tax deadlines and F24s — without opening the browser.

Official extension, published on the Raycast Store by [onesto.it](https://www.raycast.com/onesto.it).

## Commands

- **Unpaid Invoices** — open and overdue invoices with the amount still due; open the PDF or register a payment in two keystrokes.
- **Create Invoice** — issue a new electronic invoice (client, numbering and payment method are loaded live from your account) and optionally send it to SDI. A confirmation dialog always summarizes the amount before anything is sent.
- **Tax Deadlines** — overdue / due today / upcoming tax deadlines, with the F24 PDF one keystroke away and a "Mark as Paid" action.
- **SDI Issues** — invoices rejected or in error at the Italian exchange system, with the SDI error message.
- **Create Client** — add a client from its Italian VAT number (automatic registry lookup) or manually.
- **Onesto Status** (menu bar) — the total left to collect and urgent tax deadlines, always visible and refreshed every 15 minutes.

## Setup

1. You need an [Onesto](https://onesto.it) account.
2. In Onesto go to **Integrazioni** → card **"Onesto per Raycast"** → **Genera chiave per Raycast** (or open [app.onesto.it/company/integrations](https://app.onesto.it/company/integrations) directly).
3. Copy the key (it is shown only once) and paste it into the extension's **API Key** preference the first time you run a command.

## Security

- The dedicated Raycast key is **scope-limited**: it can read invoices/taxes, issue invoices, register payments and create clients — it can **not** modify or delete anything.
- The key **expires after 1 year** and can be **revoked at any time** from the Onesto integrations page; the extension stops working immediately.
- The key is stored in Raycast's encrypted preferences, is only ever sent over HTTPS to `api.onesto.it`, and is never logged.
- The extension has no third-party dependencies and no analytics.
