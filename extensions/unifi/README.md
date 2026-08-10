# UniFi Network

View devices and clients on your UniFi network, 100% locally.

View active ports and radios, restart devices, quickly find device IP's and much more!

Currently limited by what has been exposed on the UniFi API, but will update as more is added.

## Requirements

- UniFi Network: `^9.0`

## Creating an API Key

1. Visit your UniFi Network dashboard (normally: [https://192.168.1.1/network/default](https://192.168.1.1/network/default))
2. Go to Settings -> Admin & Users (under Control Plane, usually [https://192.168.1.1/network/default/settings/admins](https://192.168.1.1/network/default/settings/admins))
3. Find your admin user and click on it.
4. At the bottom of the panel that comes up, you should see a section called `Control Plane API Key`. Click `Create New`.
5. Name your key and click `Create`
6. You'll now have your API Key, save it somewhere secure as you wont be able to retrieve this one again.
7. Enter the key into the preferences for the extension!
