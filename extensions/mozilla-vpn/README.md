# Mozilla VPN Connect

_Interact with the Mozilla VPN client from Raycast without even opening the Mozilla client._

### What does it do?

- It checks that the application is installed and prompts you to download and install if it is not.
- It checks if you are logged in and opens the app if you are not logged in.
- It connects using the Mozilla VPN client to the Mozilla VPN service.
- It displays the current server the Mozilla VPN client is configured for.
- It fetches the current external IP and geolocates the IP's Country and city. It then refreshes when it connects to the VPN.

### What it doesn't do (yet).

- Unfortunately, the command to select a server does not work. You can list the servers and pick one, but it seems the CLI command for the application is broken. I would love to figure out how to configure the configuration file or interact with the client to enable this feature. **PRs are definitely welcome!**

### Requirements

- Must have a Mozilla VPN account
- Must have the Mozilla VPN client downloaded and configured.

### CLI commands used for Mozilla Client

Client Connect `/Applications/Mozilla\ VPN.app/Contents/MacOS/Mozilla\ VPN activate`

Client Disconnect `/Applications/Mozilla\ VPN.app/Contents/MacOS/Mozilla\ VPN deactivate`

Status `/Applications/Mozilla\ VPN.app/Contents/MacOS/Mozilla\ VPN status`

    Status shows if the client is connected or not, and the server city and country it is configured for. There are other details here like all devices configured for the service.

### Api's used for gathering IP data

`https://api.ipify.org` For displaying the current IP address.

`http://ip-api.com` For displaying the geolocation of the IP address.
