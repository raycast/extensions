# Parcel

This Raycast extension allows Parcel app users to view their upcoming and active deliveries directly within Raycast, as well as add new deliveries to track.

## Features

- View all your active deliveries
- See detailed delivery information including carrier, tracking number, and status
- View the tracking history for each delivery
- Easy access to tracking numbers through copy actions
- Add new deliveries to Parcel directly from Raycast

## Setup

1. Generate an API key at [web.parcelapp.net](https://web.parcelapp.net/)
2. Install this extension in Raycast
3. When prompted, enter your API key in the extension preferences

## Usage

- Run the "My Deliveries" command to see all your active deliveries
- Use "Add Delivery" to add a new package with tracking information to Parcel
- Search for specific deliveries by typing in the search bar
- Select a delivery to see detailed information
- Use the action menu to copy tracking numbers or open the Parcel web app

## Commands

### My Deliveries

View all your active deliveries in Parcel.

### Add Delivery

Add a new delivery to track in Parcel using a form interface. You can enter:

- Tracking Number (required): The tracking code for your package
- Description (optional): A description to help you identify your package

## Preferences

- **API Key**: Your Parcel API key (required)

## Notes

- This extension requires a Parcel premium subscription to generate an API key
- Data is refreshed each time you run the command
- The extension respects the Parcel API guidelines and doesn't poll excessively
- The "Add Delivery" command uses Parcel's protocol handler to add packages
- Raycast window closes automatically after adding a package for a seamless experience

## Support

If you encounter any issues with this extension, please contact the extension author. For issues with the Parcel API or app, please visit [parcelapp.net/help](https://parcelapp.net/help/).
