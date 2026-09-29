# NordVPN for Raycast on Windows

Control the NordVPN Windows app from Raycast. The extension uses the NordVPN app already installed on your PC; it does not include or install the VPN client.

This is an independent, unofficial extension and is not affiliated with, endorsed by, or sponsored by NordVPN.

## Screenshots

![Searching Italy and its cities](metadata/screenshots/02-country-city-search.png)

## Setup

1. Install and sign in to the NordVPN Windows app.
2. Install this extension in Raycast.
3. In Raycast preferences for this extension, set **NordVPN executable path** to the NordVPN CLI executable. The default is:

   ```text
   C:\Program Files\NordVPN\NordVPN.exe
   ```

   Change the path if NordVPN is installed elsewhere. The preference is required and is passed directly to Windows process execution; it is not run through a shell.

## Commands

- **Status** reads the `NordLynx` network adapter status with PowerShell and shows the public IP and country reported by the geolocation service.
- **Quick Connect** runs `NordVPN.exe --connect`.
- **Connect to Country** loads countries and cities from NordVPN's public server API. Search for a country to connect to its recommended group, or search for a city to select a NordLynx server in that city. If the country API is unavailable, a built-in country list is shown; city server selection requires the live NordVPN server API.
- **Disconnect** runs `NordVPN.exe --disconnect`.

NordVPN's Windows CLI may exit successfully without reporting whether a connection succeeded. Connect and disconnect commands therefore poll the NordLynx adapter and public IP/location for up to 15 seconds. A success toast is shown only when the requested state is confirmed; otherwise Raycast shows a failure or timeout.

## Network and privacy

The extension does not ask for or store NordVPN account credentials. The installed NordVPN app handles authentication and VPN configuration.

- `https://ipwho.is/` is queried to obtain the public IP, country, and country code. This is used to display status and verify that connecting or disconnecting changed the public IP.
- `https://api.nordvpn.com/v1/servers/countries` supplies the country/city list.
- `https://api.nordvpn.com/v1/servers` supplies server names and locations when selecting a city. The extension picks an online NordLynx server with the lowest reported load in that city.

These HTTPS services can see the requester's public IP as part of the network request. `ipwho.is` specifically geolocates and returns that IP. During connection verification, the geolocation service may be queried approximately once per second for up to 15 seconds. No NordVPN credentials are sent to either service.

The `ipwho.is` free endpoint documents a limit of 1,000 requests per day per client IP. If that limit is reached, status lookups and connection verification may fail until the quota resets.
