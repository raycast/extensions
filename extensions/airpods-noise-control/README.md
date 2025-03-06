# AirPods Noise Control

This is a simple extension that toggles between Noise Cancellation, Transparency
or Adaptive and toggles Conversation Awareness on AirPods.
> Adaptive and Conversation Awareness will only work with supported AirPods

⚠️ **This extension has only been tested on macOS Ventura `13.2`, `13.3` and Sonoma `14.1.1`.**

Unfortunately, due to limitations in AppleScript, some extra configuration is necessary.
Please ensure all fo the configuration properties are set correctly.

## Configuration

### AirPods List Position

Control Center does not expose the name of the
output devices in the Sound menu. You must configure the
command with the position of your AirPods in the device list.

1. Ensure your AirPods are connected.
2. Open the Sound menu in the menu bar.
3. Count the position of your AirPods in the list (first is 1, second is 2, etc.).
4. Set the **"AirPods List Position"** configuration value to the position of your AirPods.

### Localization

The script uses the localized name of the Sound menu to find it in the menu bar.
If you are using a language other than English (US), you must configure the
command with the localized name of the Sound menu.

1. Open System Settings.
2. Locate the settings pane corresponding to Control Center.
3. Set the "Control Center Localization" configuration value to the title of that settings pane.
4. Open Control Center.
5. Locate the module corresponding to your volume slider.
6. Set the "Sound Menu Localization" configuration value to the title of that module.

## Sound Menu

This is **optional**, but **highly recommended**. If you do not enable
this setting, the extension will have to open Control Center and navigate the
menu every time you use it, which will be slower and more disruptive.

1. Open System Settings.
2. Navigate to Control Center > Control Center Modules > Sound.
3. Set the setting to either **"Show When Active"** or **"Always Show in Menu Bar"**.
