import { Action, ActionPanel, environment, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { AutoInstall } from "./components/autoInstall";
import { Favorite } from "./components/favoritesForm";
import DisplayPlacer from "./displayplacer";
import { listScreenInfo } from "./utils/displayplacer";
import { useFavorites } from "./utils/use-favorites";

export default function Config() {
  const [isError, setIsError] = useState<boolean>();
  const { push } = useNavigation();
  const { favorites } = useFavorites();
  useEffect(() => {
    try {
      listScreenInfo();
      setIsError(false);
    } catch (e) {
      console.error(e);
      setIsError(true);
    }
  }, []);

  return (
    <List enableFiltering={false} isShowingDetail searchBarPlaceholder="">
      <List.Item
        title="👋🏻 Welcome!"
        detail={
          <List.Item.Detail
            markdown={`
# 👋🏻 Welcome!
Thanks for checking out this extension. The primary purpose of this utility is to help you quickly switch between various screen resolutions. Some common cases for this include:
- Switching display settings when a laptop is connected to external displays.
- If you typically work on a high-resolution display you can quickly switch to a lower resolution to share you screen in a virtual meeting to allow others to see your screen easier.
- Set your screen to a specific resolution before recording a screencast.
- And of course, to see it all back to normal when you're done with any of the above!
  `}
          />
        }
      />
      <List.Item
        title="💿 Step 1: Install Utility"
        actions={isError && <AutoInstall />}
        detail={
          <List.Item.Detail
            markdown={`# 💿 Install Utility

${
  isError
    ? `This extension depends on the \`displayplacer\` command-line utility that is not detected on your system. You must install it continue.

If you have homebrew installed, simply press **⏎** \`return\` to have this extension install it for you.

To install homebrew, visit [this link](https://brew.sh)

Or, to install \`displayplacer\` manually, [click here](https://github.com/jakehilborn/displayplacer).`
    : "✅ You already have the displayplacer utility installed! Proceed to Step 2."
}`}
          />
        }
      />
      <List.Item
        title="✅ Step 2: Create a Preset"
        actions={
          favorites.length === 0 && (
            <ActionPanel>
              <Action title="Save Display Preset" onAction={() => push(<Favorite />)} />
            </ActionPanel>
          )
        }
        detail={
          <List.Item.Detail
            markdown={`# ✅ Create a Preset
${
  favorites.length > 0
    ? `✅ You already have ${favorites.length} preset${favorites.length !== 1 && "s"} saved! Proceed to Step 3.`
    : `Presets are created **automatically** based on your computer's current display settings. Once you've adjusted your display settings accordingly, you can save that configured into a preset using this extension.

To save your current screen settings as a preset, press

\`⏎ return\` and then click the **Create Preset** button.`
}`}
          />
        }
      />
      <List.Item
        title="🖥️ Step 3: Load Preset"
        actions={
          <ActionPanel>
            <Action.Push target={<DisplayPlacer />} title="List Presets" />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            markdown={`# 🖥️ Load Preset
To load a preset, use the **Switch Display Preset** command to list all your presets and select one to load.

To try it out now, press \`⏎  return\``}
          />
        }
      />
      <List.Item
        title="❓ Troubleshooting"
        detail={
          <List.Item.Detail
            markdown={`# ❓ Troubleshooting
On rare occasions, the screen ID of your displays may change. You can re-save your presets by selecting them and choosing to *Edit Display Preset* from the actions menu.

**Still unable to install or load presets?** You may need to add a custom shell path in the Raycast preferences for this extension. This setting can change where the system searches for where

\`displayplacer\` and \`homebrew\` is installed.`}
          />
        }
      />
      <List.Item
        title="💡 Tip: Load Preset via hotkey"
        detail={
          <List.Item.Detail
            markdown={`# 💡 Load Preset via hotkey
If you'd like to load a preset without even launching Raycast, you can assign a hotkey to the various **Load Preset by #X** commands in the Raycast preferences > Extensions tab.

![Hotkey Example](file://${environment.assetsPath}/hotkey.png)

If you don't plan on using this feature, you can also hide these commands so they don't clutter your Raycast menu.`}
          />
        }
      />
      <List.Item
        title="🎉 All done? Hide this screen"
        detail={
          <List.Item.Detail
            markdown={`# 🎉 Congratulations!
If you're comfortable with all the setup, you can hide this screen by disabling this command in the Raycast preferences.`}
          />
        }
      />
    </List>
  );
}
