# Delivery Tracker

Tracks deliveries, packages, and parcels in Raycast. Remembers your deliveries, so you can keep watch as they make
their way to you.

This extension does not use a third-party tracking service as a proxy. It directly integrates with each supported
carrier, which allows you to be in charge of your privacy.

## Features

- **Track Multiple Carriers**: Support for UPS, FedEx, and USPS with direct API integration
- **Smart Organization**: Deliveries automatically grouped by status (Arriving Today, In Transit, Delivered)
- **Delivery Notes**: Add optional notes to any delivery for better organization
- **Archive System**: Archive delivered packages instead of deleting them, with a dedicated view to browse archived items
- **Menu Bar Extra**: Quick glance at your deliveries from the menu bar with auto-refresh every 10 minutes
- **Search & Filter**: Real-time search by name or tracking number, filter by specific carrier
- **Carrier Icons**: Visual identification with carrier-specific favicons and themed fallback icons
- **Keyboard Shortcuts**: Efficient navigation with comprehensive keyboard shortcuts throughout the extension

## Commands

- **Track Deliveries**: View and manage all your active deliveries with sections, filtering, and search
- **Track New Delivery**: Add a new delivery to track with optional notes
- **View Archived Deliveries**: Browse deliveries you've archived with the ability to unarchive them
- **Delivery Tracker Menu Bar**: Quick status overview in your menu bar (auto-refreshes every 10 minutes)

## Supported Carriers

A carrier can either support online updating of the tracking over the Internet or not. You are able to specify a manual delivery date for a delivery from a carrier that does not support online updating or a carrier that's missing credentials.

### United Parcel Service (UPS)

In the settings, you'll need two things to access the UPS API.
- Client ID.
- Client secret.

Navigate to the [UPS Developer Portal](https://developer.ups.com/) and walk through the getting started steps.

The name of the app can be anything and is only for you.  You do not need a callback URL.  Pick the option that you want
to integrate UPS in your business because you are _not_ representing other users for why you need API credentials.  Make
sure to add the Tracking API product.  You'll need a shipper account tied to your normal UPS account; UPS will walk you
through this process if you don't have one yet.

### Federal Express (FedEx)

In the settings, you'll need two things to access the FedEx API.
- API key.
- Secret key.

Navigate to the [FedEx Developer Portal](https://developer.fedex.com/) and walk through the getting started steps.

Select the track API when creating the API project.  The name of the project can be anything and is only for you.  After
creating the project, you'll need to subsequently create the production key and use that in this extension.  Do not use
the test key, or you'll get incorrect tracking information.  The name of the production key name can be anything.

### United States Postal Service (USPS)

While the USPS does support online updating of the tracking over the Internet, they only seem to allow large enterprise
companies or companies that will also be actively sending packages.  Therefore, I have not been able to verify code that
works, so the USPS carrier only supports setting manual delivery dates for now.

## Contributing

Feel free to file an issue or fork and PR through the
[main extension repository](https://github.com/raycast/extensions)
[workflow](https://developers.raycast.com/basics/contribute-to-an-extension).

If you are adding support for a new carrier, you can take inspiration from the [existing carriers](./src/carriers).
Please update the documentation here on how one signs-up for the carrier and gets any API keys. When adding a new carrier, please include a 40x40px PNG icon in the `assets/` directory named `[carrier-name].png` (e.g., `dhl.png`). The icon should be the carrier's logo or favicon on a transparent background.
