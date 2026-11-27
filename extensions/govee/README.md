# Govee

Control your [Govee](https://govee.com/) Lights using [Raycast](https://raycast.com).

## Usage

1. Install the Extension
2. Open the Extension and check if you see your Govee Lights in the list (network)
3. If not, check if your lights are connected to the same network as your computer and `LAN Control` is enabled
   - Open your `Govee Home App`
   - Click on the light you want to control
   - Click on the settings icon in the top right corner
   - Scroll down and enable LAN Control
   - Reload the Extension. You might need to restart the light for it to show up eventually

## Usage

### Lights

- Your device should show up in the list "Devices"
- It should indicate wether or not it is on (💡)
  - **Note**: This is not always accurate, sometimes it can take a while before the light synchronizes with the Extension
- On the right side it should indicate the brightness level and color
- Open `Actions` to control your light
- You can give your lights a custom name to make it easier to identify them

### Scenarios

- You can create scenarios in the Extension. This will let you control multiple lights at once
- You can set the action for all selected lights
- You can individually set the action for each light. Individually set actions will override the action for all lights.

### Govee API key (optional)

Some lights have no LAN Control (for example most bulbs). With a Govee API key the extension can control them through the Govee cloud, and it also unlocks snapshots, music modes, white temperature and app names for your lights. Lights on LAN keep using LAN.

[How to get a key (with screenshots)](https://developer.govee.com/reference/apply-you-govee-api-key). Paste it in the extension's settings.

The Govee cloud allows 10 commands per light per minute, so Subsection Coloring over the cloud is limited to 9 colors and may pause for the limit.

### Subsection Coloring

On strips with segments, tick a few colors and apply them as a Split (equal blocks) or a Gradient. On supported models with LAN Control this is instant; otherwise it goes through the cloud.

### Menu Bar

The optional `Govee Menu Bar` command shows your lights, scenarios and snapshots in the macOS menu bar. Enable it in Raycast's settings.
