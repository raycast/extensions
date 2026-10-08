# Revenue Bar

See your Stripe, Lemon Squeezy, Gumroad and Paddle revenue in one dashboard and in your menu bar.

Requires an account with at least one of these providers. Pro features require a paid Revenue Bar Pro license (one-time purchase via Lemon Squeezy).

## Setup

1. Create a read-only key for each provider you use (see [Provider keys](#provider-keys) below).
2. Open Raycast, run **View Revenue Dashboard**, and paste the keys into the extension preferences when asked. You can change them later with ⌘, from any Revenue Bar command.
3. Optional: set **Display Currency** (default `USD`). Totals in other currencies are converted with the daily ECB reference rates.
4. Optional: paste your **Revenue Bar Pro License Key** to unlock everything listed under [Free and Pro](#free-and-pro).

### Provider keys

**Stripe: restricted key (read only)**

1. Open [Developers → API keys](https://dashboard.stripe.com/apikeys) and click **Create restricted key**.
2. Name it "Revenue Bar". Leave every permission at **None** except these, which you set to **Read**:

   | Resource | Permission | Used for |
   |---|---|---|
   | Charges (includes refunds) | `charge_read` | Sales, refunds |
   | Balance | `balance_read` | Fees and net revenue |
   | Customers | `customer_read` | Customer emails and search |
   | Disputes | `dispute_read` | Disputes and chargebacks |
   | Subscriptions | `subscription_read` | MRR, new and churned subscriptions |
   | Coupons (optional) | `coupon_read` | Subtracting forever coupons from MRR |

3. Copy the `rk_live_…` key into **Stripe Restricted API Key**. A `rk_test_…` key works too and links to the test-mode dashboard.

**Lemon Squeezy: API key**

1. Open [Settings → API](https://app.lemonsqueezy.com/settings/api) and create a key named "Revenue Bar".
2. Copy it into **Lemon Squeezy API Key**. Lemon Squeezy keys cannot be scoped. Revenue Bar only sends `GET` requests with it.

**Gumroad: application access token**

1. Open [Settings → Advanced](https://gumroad.com/settings/advanced), scroll to **Applications**, and create an application (name "Revenue Bar"; the redirect URI can be `http://localhost`).
2. Click **Generate access token** and copy it into **Gumroad Access Token**. Revenue Bar only reads sales (`GET /v2/sales`, `GET /v2/user`).

**Paddle Billing: API key with read permissions**

1. Open **Paddle → My account → Settings → Authentication**, choose the **API keys** tab, and click **New API key**.
2. Give it **Read** on these permissions only: `transaction.read`, `adjustment.read`, `subscription.read`, `customer.read`, and optionally `discount.read` (for subtracting recurring discounts from MRR).
3. Copy the `pdl_live_apikey_…` key into **Paddle API Key**. Sandbox keys (`pdl_sdbx_apikey_…`) are detected automatically. **Paddle Environment** only matters for keys without that prefix.

## Commands

- **View Revenue Dashboard**: Today, last 7 days, last 30 days or month to date. Shows gross revenue, net revenue after fees, refunds and the sales count, combined and per provider, with a detail view for each.
- **View Recent Sales**: the latest orders across providers, with a provider filter and a detail pane.
- **Revenue Menu Bar** (Pro): revenue for the range you pick, in the menu bar, with an optional line per provider. Refreshes every 15 minutes.
- **View Subscriptions** (Pro): MRR, active subscriptions, and new and churned subscriptions this month (Stripe, Lemon Squeezy, Paddle). The detail view explains how MRR is calculated.
- **View Refunds and Disputes** (Pro): refunds, disputes and chargebacks from the last 30 days.
- **Search Customers** (Pro): find a customer by email across providers and see their orders.
- **Export Sales to CSV** (Pro): exports the sales of the range selected in the dashboard to `~/Downloads`.
- **Manage License**: see your license status, validate it, or deactivate it on this Mac.

## Free and Pro

Revenue Bar is free. Pro features require a paid Revenue Bar Pro license (one-time purchase via Lemon Squeezy).

| | Free | Pro |
|---|---|---|
| Dashboard and Recent Sales | First configured provider | All providers |
| Menu bar | — | ✓ |
| Subscriptions, Refunds and Disputes, Customer search | — | ✓ |
| CSV export | — | ✓ |

- **Buy:** run **Manage License** and choose **Buy Revenue Bar Pro**, or use the same action on any locked item.
- **Activate:** paste the key into the **Revenue Bar Pro License Key** preference. Revenue Bar activates it for this Mac.
- **Offline use:** the license is validated at most once every 7 days and keeps working offline for 14 days after the last successful validation.
- **Moving to another Mac:** run **Manage License → Deactivate on This Mac** to free the activation.

## Privacy

Revenue Bar has no server and no analytics. Keys stay in Raycast's preferences. The license key is stored only as a SHA-256 fingerprint after validation. These are all the requests it makes:

| Destination | When | What is sent |
|---|---|---|
| `api.stripe.com` | You configured a Stripe key | Your restricted key, date ranges, a customer email when you search |
| `api.lemonsqueezy.com/v1` | You configured a Lemon Squeezy key | Your API key, page numbers, a customer email when you search |
| `api.gumroad.com` | You configured a Gumroad token | Your token, date ranges, a customer email when you search |
| `api.paddle.com` / `sandbox-api.paddle.com` | You configured a Paddle key | Your API key, date ranges, a customer email when you search |
| `api.frankfurter.dev` | Totals contain more than one currency (at most once a day) | Your display currency code |
| `api.lemonsqueezy.com/v1/licenses` | You entered a license key (at most once every 7 days) | The license key and an instance name (`Revenue Bar · <your Mac's hostname>`) |
| Provider websites (favicons via Raycast) | Lists show provider icons | Nothing about you |
