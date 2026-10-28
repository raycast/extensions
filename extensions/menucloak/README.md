# MenuCloak for Raycast

Control the native MenuCloak app without leaving Raycast.

## Requirements

[MenuCloak 1.9 or newer](https://github.com/dans-huang/MenuCloak/releases/latest) must be installed and running on your Mac. The unified download includes the native app and these five Raycast commands.

## Google Calendar

Google sign-in lives in the native MenuCloak app, not in the Raycast extension. Run **Open MenuCloak Settings**, then click **Connect…** under Google Calendar. Sign-in opens in your default browser and returns directly to MenuCloak.

MenuCloak requests read-only Calendar access and stores the reusable login in macOS Keychain. The Raycast extension never receives your Google credentials or Calendar data; it only sends local `menucloak://` commands to the app.

## Commands

- **Set Focus Text** — change the focus shown on the left side of the menu bar.
- **Toggle MenuCloak** — toggle the cloak with one command or hotkey.
- **Turn On MenuCloak** — cover application menus.
- **Turn Off MenuCloak** — reveal application menus.
- **Open MenuCloak Settings** — edit focus text or connect Google Calendar.

The extension communicates with MenuCloak using its local `menucloak://` URL scheme.
The extension itself uses no account, analytics, or network access.
