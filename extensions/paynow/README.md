# PayNow Raycast Extension

Unofficial Raycast extension for [PayNow](https://www.paynow.gg) - a Merchant of Record specializing in digital goods.

## Features

> Right now, the scope of the extension development's direction is towards:
> - Commonly used features.
> - Free PayNow features (I can't test paid features, as I'm on the free plan).
> - Read-only features (no write actions yet).
> - Only flat, non-cross-feature actions (e.g. View Order from a Product is not supported and not planned as initial scope).

- Products
  - List Products
  - View Product Details
- Tags
  - List Tags
  - View Tag Details
- Orders
  - List Orders
  - View Order Details
  - *Pagination not supported yet
- Webhooks
   - List Webhooks
   - View Webhook Events
     - View event details - easily copy their payload

### Planned Features

*No particular order*

- Coupons
  - List Coupons
  - View Coupon Details
- Customers
  - List Customers
  - View Customer Details
- Subscriptions (with Trial support)
  - List Subscriptions
  - View Subscription Details
- Gift Cards
  - List Gift Cards
  - View Gift Card Details

### Feature Requests

Got a feature request? Please open an issue or contact me on Discord: **MaxiJonson**. Please take note that I usually only work on this project occasionally (literally only on the 1h30 train ride to and from work lol), so please be patient.

## Setup

This extension allows you to connect multiple PayNow stores. You can manage your stores in the "Manage Stores" command. If none are configured, you'll be prompted to add one when you try to use any of the commands.

> Note: the API key you use should have at least read access to the features you want to use. Currently, the extension **does not handle permission errors gracefully** and always assumes it has the right permissions when making requests.

## Local Installation

This extension can be downloaded on the official Raycast Store by searching for it's ID: `paynow`. 
If you want the latest features not yet published, you can install it locally by following these steps:

1. Clone the repository
   ```bash
   git clone https://github.com/maxijonson/paynow-raycast-extension.git
   # or: gh repo clone maxijonson/paynow-raycast-extension
   ```
2. Install the dependencies
   ```bash
   cd paynow-raycast-extension
   npm install
   ```
3. Build the extension. You'll need to run the development server to use it, which is a script that doesn't exit on its own.
   ```bash
   npm run dev
   # Then press "CTRL + C" to stop the process
   ```
4. Open Raycast, use the "Manage Extensions" command and use the "Import Extension" action. Then, select the repo folder you cloned in step 1.

## Updating the local extension

Because this extension is not on the official Raycast Store, you'll need to manually update it when there are new releases. You won't need to re-import it though.

1. Pull the latest changes
   ```bash
   cd paynow-raycast-extension
   git pull origin main
   ```
2. Install any new dependencies
   ```bash
   npm install
   ```
3. Restart the development server to rebuild the extension.
   ```bash
   npm run dev
   # Then press "CTRL + C" to stop the process
   ```
