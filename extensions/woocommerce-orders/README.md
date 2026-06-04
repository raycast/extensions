# WooCommerce Orders

Search WooCommerce orders and view sales metrics from Raycast.

## Commands

- **Search Orders** lists recent WooCommerce orders.
- **Search Failed Orders** shows orders with the `failed` status.
- **Search Pending Payment Orders** shows orders with the `pending` status.
- **Search Abandoned Carts** shows WooCommerce checkout drafts with the `checkout-draft` status, when the store exposes them through the REST API.
- **Sales Dashboard** shows today's or this week's sales totals, including gross sales, net sales, taxes, shipping, orders, discounts, and refunds.

## Setup

Create WooCommerce REST API credentials in WordPress:

1. Go to `WooCommerce > Settings > Advanced > REST API`.
2. Create a key with `Read` permissions.
3. Add the Store URL, Consumer Key, and Consumer Secret in the Raycast extension preferences.

Use an HTTPS Store URL for production stores. The extension sends WooCommerce credentials with each REST API request and rejects non-local HTTP URLs to avoid exposing credentials in transit.

## Data and Security

- The extension is read-only and only uses WooCommerce REST API `GET` requests.
- Consumer Key and Consumer Secret are stored as Raycast password preferences.
- Credentials are only sent to the configured WooCommerce Store URL.
- Customer data is displayed locally in Raycast and is not sent to any third-party service.
- The extension does not write to WooCommerce, create orders, update orders, or change store settings.

## Sales Dashboard Notes

The Sales Dashboard uses WooCommerce sales reports as the primary source because WooCommerce already calculates net sales, taxes, shipping, discounts, and refunds. If the reports endpoint is unavailable, the command falls back to calculating totals from paid orders in the selected period and labels the source as **Orders Fallback**.

For final validation, compare the dashboard values with `WooCommerce > Analytics > Revenue` in WordPress.
