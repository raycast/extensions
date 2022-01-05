import { ActionPanel, ActionPanelItem, Detail, useNavigation } from "@raycast/api";

export default function Help({
  onExit = () => {
    return;
  },
}) {
  const { pop } = useNavigation();
  return (
    <Detail
      navigationTitle="DisplayPlacer Help"
      actions={
        <ActionPanel>
          <ActionPanelItem title="Back" onAction={pop} />
        </ActionPanel>
      }
      markdown={`
# 🖥️  DisplayPlacer Extension Help
Welcome! Thanks for checking out this extension. The primary purpose of this utility is to help you quickly switch between various screen resolutions. Some common cases for this include:
- Switching display settings when a laptop is connected to external displays.
- If you typically work on a high-resolution display you can quickly switch to a lower resolution to share you screen in a virtual meeting to allow others to see your screen easier.
- Set your screen to a specific resolution before recording a screencast.
- And of course, to see it all back to normal when you're done with any of the above!

## How to use this extension
1. Set your display to the desired resolution, rotation, refresh rate, etc. using standard MacOS System Preferences
2. Open this extension and select the "New Display Preset" option, or press ⌘+N
3. Give your preset a name and optional subtitle, then save.
4. To switch between your presets, select them within the exetnsion, or set a hotkey for the preset number in Raycast preferences.
The blue dot 🔵 icon indicates that your display settings match the indicated preset. The preset numbers are displayed on the right of each preset.

NOTE: On rare occasions, the screen ID of your displays may change. You can re-save your presets by selecting them and choosing to *Edit Display Preset* from the actions menu.

  `}
    />
  );
}
