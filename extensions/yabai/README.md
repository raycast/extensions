# Yabai

> Run Yabai window management commands directly from Raycast.

## Installation

To use this extension, you must have `yabai` installed on your machine.

The easiest way to install this is using [Homebrew](https://brew.sh/). After you have Homebrew installed, run the
following command in your terminal:

```bash
brew install koekeishiya/formulae/yabai
```

[Official installation instructions](<https://github.com/koekeishiya/yabai/wiki/Installing-yabai-(latest-release)>)

## Additional Setup for MenuBar Desktop Indicator

To enable the desktop indicator in the MenuBar, you need to add a specific command to your yabairc configuration file.

Please add the following line to your yabairc file:

```bash
yabai -m signal --add event=space_changed action="nohup open -g raycast://extensions/krzysztoff1/yabai/screens-menu-bar?launchType=background > /dev/null 2>&1 &"
```

This command will allow the Raycast extension to run in the background and update the menubar indicator whenever you switch desktop spaces.

After adding this line, make sure to reload your yabairc configuration or restart yabai for the changes to take effect.
