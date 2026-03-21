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

## Setup

This extension allows you to connect multiple PayNow stores. You can manage your stores in the "Manage Stores" command. If none are configured, you'll be prompted to add one when you try to use any of the commands.

> Note: the API key you use should have at least read access to the features you want to use. Currently, the extension **does not handle permission errors gracefully** and always assumes it has the right permissions when making requests.
