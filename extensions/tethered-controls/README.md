# Tethered for Raycast

Control [Tethered](https://tetheredmac.com/) directly from Raycast. Tethered must be installed and running. A number of actions are only available to users with Pro access.

## Commands

- Open the Tethered website to download the Mac app.
- Choose Auto, Low, or High Power mode.
- Start or stop Caffeinate, or search your saved Caffeinate presets.
- Start a timed Caffeinate session by entering a duration from 1 to 1,440 minutes.
- Search and apply your saved Tethered profiles.
- Enable or disable Topup, Sailing, and Heat Protection.
- Start or cancel a manual battery calibration cycle.
- Show the current battery and control status.
- Open Tethered Pro checkout from its own Raycast command.

Saved profiles and Caffeinate presets are read from Tethered's local preferences. Some actions require an unlocked Tethered feature or suitable battery conditions. High Power requires a supported Mac. Topup requires AC power and active charging control. Calibration can charge to full and then discharge the battery.

## Setup

Run **Get Tethered** to use the same download link as the Tethered website. Install and open the current Tethered app, then use the extension's controls. Search for **Tethered** in Raycast to find its commands. You can assign aliases or hotkeys in Raycast's Extensions settings.

The extension sends requests to the running Tethered app. If **Show Status** cannot get a fresh response, check that Tethered is running and updated. Raycast's action confirmation means the request was sent; use **Show Status** or Tethered itself to confirm the resulting state.

**Get Tethered Pro** requires the updated Tethered app to be running and an account signed in. It opens Tethered's checkout in your browser; payment and license activation remain handled by Tethered.
