# Aranet Extension

This extension will display your Aranet4 data over Bluetooth. It also comes with a menu bar command to display your CO₂ level that refreshes every 5 minutes.

# Notes

1. The retreival process can seem slow because communicating over low energy bluetooth is just slow.
2. If you see a mistach between the CO₂ in your menu bar and the `aranet` command, the menu bar updates every 5 mintues where the `aranet` command updates when it's invoked.
3. The first time you activate the menu bar extension, it can take a few seconds to show up (it's loading).
4. If you can't see your menu bar CO₂, you might have too many menu bar items and your Mac may choose to hide it.

# Setup

1. Download the Aranet Home app from the [Mac App Store](https://apps.apple.com/us/app/aranet-home/id1392378465).
2. Pair your Aranet4 using the Aranet Home app.
3. Install [claranet4](https://github.com/bede/claranet4). This is a Python CLI tool to collecting readings from Aranet4 Bluetooth sensors. View their [README](https://github.com/bede/claranet4?tab=readme-ov-file#install) for more info.
4. Good to go!
