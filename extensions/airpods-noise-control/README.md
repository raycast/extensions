# AirPods Noise Control

This is a simple extension that toggles between Noise Cancellation, Transparency
or Adaptive and toggles Conversation Awareness on AirPods.
> Adaptive and Conversation Awareness will only work with supported AirPods (AirPods Pro only)

⚠️ **This extension has been tested on macOS Tahoe `26.0`.**

Unfortunately, due to limitations in AppleScript, some extra configuration is necessary.
Please ensure all of the configuration properties are set correctly.

## Configuration

### AirPods List Position

Control Center does not expose the name of the
output devices in the Sound menu. You must configure the
command with the position of your AirPods in the device list.

1. Ensure your AirPods are connected.
2. Open the Sound menu in the menu bar.
3. Count the position of your AirPods in the list (first is 1, second is 2, etc.).
4. Set the **"AirPods List Position"** configuration value to the position of your AirPods.

### AirPods Type

Select your AirPods model to ensure the correct menu layout is used:

- **AirPods Pro**: Has Transparency, Adaptive, Noise Cancellation modes + Conversation Awareness
- **AirPods Max**: Has Off, Transparency, Noise Cancellation modes (no Adaptive or Conversation Awareness)

### Localization

The script uses the localized name of the Sound menu to find it in the menu bar.
If you are using a language other than English (US), you must configure the
command with the localized name of the Sound menu.

1. Open System Settings.
2. Navigate to Control Center > Control Center Modules > Sound.
3. Set the "Sound Menu Localization" configuration value to the localized name of the Sound module.

## Sound Menu

This is **optional**, but **highly recommended**. If you do not enable
this setting, the extension will have to open Control Center and navigate the
menu every time you use it, which will be slower and more disruptive.

1. Open System Settings.
2. Navigate to Control Center > Control Center Modules > Sound.
3. Set the setting to either **"Show When Active"** or **"Always Show in Menu Bar"**.
