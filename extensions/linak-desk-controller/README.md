# Linak Desk Controller

Control the height of your Linak desk over Bluetooth, for example the IKEA IDÅSEN desk. Everything runs inside the extension, so there's nothing else to install.

## Setup

### 1. Pair your desk

The desk only accepts Bluetooth connections from devices it's paired with, so the first time you use it with this Mac:

1. **Press and hold the Bluetooth button** on the desk controller until the blue light starts blinking. The desk is now in pairing mode.
2. While the light is blinking, run **Select Desk** in Raycast and select your desk (IKEA desks show up as "Desk" followed by a number). Then run **Sit Down** or **Stand Up** to complete the pairing.

You only need to do this once. If your desk is paired with another device, such as the Desk Control app on your phone, disconnect it there first. If a command later says the desk didn't accept the connection, pair it again.

The first time you use the extension, macOS also asks for permission to use Bluetooth.

### 2. Set your heights

Set your preferred sitting and standing heights (in cm) in the extension preferences. Then set up keyboard shortcuts for **Sit Down** and **Stand Up** 🥳

## Commands

- **Stand Up** and **Sit Down** move to your saved heights.
- **Move Desk to Custom Height** moves to any height in cm.
- **Raise Desk** and **Lower Desk** move a few cm at a time (5 cm by default).
- **Stop Desk** stops a desk that's moving.
- **Select Desk** finds nearby desks and lets you choose one.
- **Move Desk** is a menu bar command that shows the current height and all of the above.

Running a new command while the desk is moving takes over from the previous one.

## Troubleshooting

- **The desk doesn't accept the connection:** the desk isn't paired with this Mac. Make sure it isn't connected to another device, such as the Desk Control app on your phone. Then hold the Bluetooth button on the controller until the light blinks and run the command again.
- **"Couldn't find your desk":** if you set a Desk identifier for an older version of the extension, it may no longer match your desk. Clear it in the preferences, or run **Select Desk** to choose your desk.
- **The reported height is off by a constant amount:** change **Lowest height** in the preferences to your desk's height at its lowest position (62 cm for IDÅSEN).
- **Raycast can't use Bluetooth:** allow Raycast in System Settings → Privacy & Security → Bluetooth.
