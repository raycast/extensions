# Sleevy

Save links to Sleevy from Raycast and browse your saved library without leaving your keyboard.

## Setup

The first time you run a Sleevy command, Raycast opens your browser to connect the extension to your Sleevy account. Approve the connection and you are returned to Raycast — no manual API key entry is required.

The default `API URL` is `https://api.sleevy.app`. Change it only if you are using a self-hosted or development Sleevy API.

You can also set `Source Name` to label captures from this device, such as `Work Laptop`. If you leave it empty, Sleevy uses your computer name.

## Commands

### Sleeve It

Saves the URL currently on your clipboard to Sleevy.

If the URL is already in Sleevy, it is moved back to the top of your library.

### View Library

Shows your saved Sleevy items. From the list, you can open an item, copy its URL, mark it read or unread, delete it, refresh the list, and show item details.

## Troubleshooting

If Raycast reports that configuration is required, open the extension preferences and make sure `API URL` is set.

If requests are unauthorized, run any Sleevy command and re-approve the browser consent screen to reconnect your account.
