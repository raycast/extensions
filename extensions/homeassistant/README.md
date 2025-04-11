<div align="center">
  <img
    src="https://github.com/raycast/extensions/blob/main/extensions/homeassistant/assets/home-assistant.png?raw=true"
    width="50"
  />

  <h1>
    Home Assistant
  </h1>

Manage your smart home with Raycast 🚀

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
- Control your media player
- Control your covers
- Show all entities
- Show all entities with attributes

and all in real time 🚀

## Obtaining the Access Token for Home Assistant

- Go to your Home Assistant instance (e.g. `https://myhomeassistant:8123`)
- Click on your profile (next to notifications) in the left sidebar
- Scroll down to the `Long-Lived Access Tokens` section
- Create a token via `Create Token`
- Store the token in a secure location; Home Assistant won't show it again
- Open the Raycast preferences for Home Assistant or start a Home Assistant command
- Set your Home Assistant URL (e.g. `https://myhomeassistant:8123`)
- Set your access token from the previous step into the `API Token` field

Now you should be able to manage your Home Assistant instance with Raycast 🚀.

## Home Network Detection

You can optionally define an internal URL for your local home network, which typically offers a faster connection.
The internal URL is used when your home network's Wi-Fi SSID is detected or when the internal URL is pingable (ping can be disabled in cases where it may be slow).
You can define one or multiple home network SSIDs.

### Example

- Home Assistant URL: `https://1234321234331.ui.nabu.casa`
- Internal URL: `http://homeassistant.local:8123`
- Home Wi-Fi SSID: `MyWifi1`, `MyWifi2`

If the current Wi-Fi SSID is `MyWifi1` the internal URL will be used.
If the current Wi-Fi SSID is `AnotherNetwork` the Home Assistant URL will be used.

## Requirements

The minimum required version of Home Assistant is `2024.04`.
