# AirPods Noise Control

This is a simple extension that toggles between Noise Cancellation and Transparency on AirPods.

⚠️ **This extension has only been tested on macOS Ventura `13.3` and macOS Sonoma `14.0`.**

Unfortunately, due to limitations in AppleScript, some extra configuration is necessary.    
Please ensure all fo the configuration properties are set correctly.

## Configuration

### AirPods List Position

Control Center does not expose the name of the
output devices in the Sound menu. You must configure the
command with the position of your AirPods in the device list.

1. Ensure your AirPods are connected (not required on macOS Sonoma).
2. Open the Sound menu in the menu bar.
3. Count the position of your AirPods in the list (first is 1, second is 2, etc.).
4. Set the **"AirPods List Position"** configuration value to the position of your AirPods.

### Toggle Mode Position

Control Center does not expose the name of the
available Noise Control modes in the Sound menu. Additionally, the
available modes change depending on your version of macOS and whether your
AirPods support Adaptive mode. You must configure the position of the
modes you want to toggle between.

1. Ensure your AirPods are connected (not required on macOS Sonoma).
2. Open the Sound menu in the menu bar.
3. Count the position of the Noise Control modes you want to toggle between (first is 1, second is 2, etc.).    
For example, if your options are "Off, Noise Cancellation, Transparency" and you want to toggle between Noise Cancellation and Transparency, you would set the configuration value to 2 and 3.
4. Set the **"Primary Toggle Position"** configuration value to the position of the mode you want to toggle to by default.
5. Set the **"Secondary Toggle Position"** configuration value to the position of the mode you want to toggle to when the primary mode is active.

### Expander Offset

You should not have to change this value, but if you have multiple AirPods
connected, the command may inadvertently open the menu for the wrong AirPods.
If this happens, you can adjust the offset to fix it. The default value is `-1`,
which is applicable if no other AirPods are present in your Sound menu. Otherwise,
try positive odd numbers until the command works correctly. For example, if you
have two pairs of AirPods connected and you want the command to target the pair lower
in the list, you would set the value to `1`.

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