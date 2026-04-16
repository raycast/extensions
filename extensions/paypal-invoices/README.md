# PayPal Invoices

Create and manage PayPal invoices without leaving Raycast.

## Setup

1. Go to [developer.paypal.com](https://developer.paypal.com)
2. Click **Apps & Credentials** and create a new app with type **Merchant**
3. Enable the **Invoicing** feature on the app
4. Copy your **Client ID** and **Client Secret**
5. Open Raycast, search for **Create Invoice**, and paste your credentials when prompted

## Commands

### Create Invoice
Fill in customer details, line items, tax, and payment options. The default action copies a shareable payment link to your clipboard. If you added an email, PayPal will also notify the client directly.

### Invoice List
View all invoices created on this machine, grouped and sorted by your preference. Actions include copying the link, sending to client, editing line items, setting due dates, and refreshing live status from PayPal.

## Notes
- Invoices are stored locally on your machine and synced with PayPal's API for live status
- This is an unofficial extension and is not affiliated with PayPal
