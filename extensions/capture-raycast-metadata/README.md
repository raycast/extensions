# Capture Raycast Metadata

Capture a screenshot for Raycast extension's metadata.

- **Capture Raycast Metadata**: Capture a screenshot for Raycast Extension's metadata.

**Tips**: 🌟🌟🌟How to use **Capture Raycast Metadata**:

- Set a shortcut for this command, open Raycast, and run the command with the shortcut to take a screenshot. Screenshots will be saved in the Download directory.
- Please keep the Raycast main window visible
- Please close other Raycast windows, such as the Preferences window

**Warning**: ⚠️⚠️⚠️This extension currently only works properly in some resolutions

- Due to the limitation of ScreenCapture App and Raycast's main window size being fixed at 750\*474, It only works fine when the actual resolution(Resolution) is two times the view resolution(UI Looks like). You can check the monitor screen information by typing `/usr/sbin/system_profiler SPDisplaysDataType` command in terminal.
- Devices confirmed to work properly: MacBook Pro 2019 13' built-in display, external 4K display (Resolution: 3840 x 2160,UI Looks like: 1920 x 1080).
- If the image size becomes 1000x625, please adjust the screen resolution in the system settings and then try to capture a screenshot. Or you can enlarge it twice in the Preview app or other app.

Here is the sample output of `/usr/sbin/system_profiler SPDisplaysDataType`, where **Resolution** and **UI Looks like** are the ones to watch

```‹
      Displays:
        Color LCD:
          Display Type: Built-In Retina LCD
          Resolution: 2560 x 1600 Retina
          Framebuffer Depth: 30-Bit Color (ARGB2101010)
          Mirror: On
          Mirror Status: Hardware Mirror
          Online: Yes
          Automatically Adjust Brightness: Yes
          Connection Type: Internal
        LG HDR 4K:
          Resolution: 3840 x 2160 (2160p/4K UHD 1 - Ultra High Definition)
          UI Looks like: 1920 x 1080 @ 60.00Hz
          Framebuffer Depth: 30-Bit Color (ARGB2101010)
          Main Display: Yes
          Mirror: On
          Mirror Status: Master Mirror
          Online: Yes
          Rotation: Supported
          Connection Type: Thunderbolt/DisplayPort
```

**Preferences**

- _Screenshot Name_: Default is Metadata
- _Screenshot Format_:
  - PNG
  - JPEG
  - PDF
  - TIFF
