# Sleevy

Save links to Sleevy from Raycast and browse your saved library without leaving your keyboard.

## Setup

This extension needs a Sleevy API Key before it can save or manage items.

1. Open the Sleevy Web Companion.
2. Go to API Key Settings.
3. Create or copy your personal API Key.
4. Open the Sleevy extension preferences in Raycast.
5. Paste the API Key into the `API Key` field.

The default `API URL` is `https://api.sleevy.app`. Change it only if you are using a self-hosted or development Sleevy API.

You can also set `Source Name` to label captures from this device, such as `Work Laptop`. If you leave it empty, Sleevy uses your computer name.

## Commands

### Sleeve It

Saves the URL currently on your clipboard to Sleevy.

If the URL is already in Sleevy, it is moved back to the top of your library.

### View Library

Shows your saved Sleevy items. From the list, you can open an item, copy its URL, mark it read or unread, delete it, refresh the list, and show item details.

## Troubleshooting

If Raycast reports that configuration is required, open the extension preferences and make sure both `API URL` and `API Key` are set.

If requests are unauthorized, create a new API Key in the Sleevy Web Companion and update the Raycast preference.
