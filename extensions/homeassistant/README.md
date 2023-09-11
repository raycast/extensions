<div align="center">
  <img
    src="https://github.com/raycast/extensions/blob/main/extensions/homeassistant/assets/home-assistant.png?raw=true"
    width="50"
  />

  <h1>
    Home Assistant
  </h1>

Raycast extension to manage your Home Assistant. Control your house with Raycast 🚀

  <p>
    <a href="https://www.raycast.com/tonka3000/homeassistant">
      <img src="https://img.shields.io/badge/Raycast-store-red.svg"
        alt="Find this extension on the Raycast store"
      />
    </a>
    <a
      href="https://github.com/raycast/extensions/blob/master/LICENSE"
    >
      <img
        src="https://img.shields.io/badge/license-MIT-blue.svg"
        alt="raycast-extensions is released under the MIT license."
      />
    </a>
    <img
      src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
      alt="PRs welcome!"
    />
    <a href="https://twitter.com/intent/follow?screen_name=tonka_2000">
      <img
        src="https://img.shields.io/twitter/follow/tonka_2000.svg?label=Follow%20@tonka_2000"
        alt="Follow @tonka_2000"
      />
    </a>
    <a href="https://open.vscode.dev/organization/repository">
      <img
        src="https://open.vscode.dev/badges/open-in-vscode.svg"
        alt="Open in Visual Studio Code"
      />
    </a>
  </p>
</div>

## Features

- Manage all your Home Assistant entities
- Control your lights
- Control your mediaplayer
- Control your covers
- Show all entities
- Show all entities with attributes

and all in real time 🚀.

## How to get the access token for Home Assistant

- Goto to your Home Assistant instance e.g. `https://myhomeassistant:8123`
- Click on your profile (next to notifications) in the left sidebar
- Scroll down to the `Long-Lived Access Tokens` section
- Create a token via `Create Token`
- Store the given token in a secure box, Home Assistant wont show it again
- Go to the Raycast preferences of Home Assistant or start a Home Assistant command
- Set your Home Assistant URL like e.g. `https://myhomeassistant:8123`
- Set your access token from the previous step into `API Token`

Now you should be able to manage your Home Assistant instance with Raycast 🚀.

## Home Network Detection

You can (optionally) define an internal URL of your local home network which is typically a faster connection.
The Internal URL is used when the WiFi SSID of your home network is detect or the internal url is ping-able (ping can be explicitly be turned off for some cases where ping can be slow).
You can defined one or multiple home network SSIDs.

### Example

- Home Assistant URL: `https://1234321234331.ui.nabu.casa`
- Internal URL: `http://homeassistant.local:8123`
- Home Wifi SSID: `MyWifi1`, `MyWifi2`

If the current WiFi SSID is `MyWifi1` the internal URL would be used.
If the current WiFi SSID is `AntoherNetwork` the Home Assistant URL would be used.