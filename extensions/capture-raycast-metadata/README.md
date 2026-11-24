# Capture Raycast Metadata

Capture a screenshot for Raycast extension's metadata.

- **Capture Raycast Metadata**: Capture a screenshot for Raycast Extension's metadata.

**Tips**: 🌟🌟🌟How to use **Capture Raycast Metadata**:

- Set a shortcut for this command, open Raycast, and run the command with the shortcut to take a screenshot.
- While exactly one extension is running with `npm run dev`, screenshots are saved to its `metadata` folder as PNG, named like `my-extension-1.png`. This goes by which dev server is running, not by what Raycast is showing, so the result toast names the extension it saved to. Otherwise they go to the **Default Save Location** (Downloads unless you choose another). Turn off **Extension in Development** to always use the Default Save Location.
- Set a **Custom Wallpaper** to capture only the Raycast window and place it on that image, so every screenshot has the same background whatever is open behind Raycast. It works with PNG, JPEG and TIFF.
- Please keep the Raycast main window visible, at its default size (not compact mode)
- The result toast offers Show in Finder (⌘O) and Copy Path. If the saved image is not 2000 × 1250 px, it says so: the Store requires that size. PDFs are saved without a size check.

**Warning**: ⚠️⚠️⚠️This extension currently only works properly in some resolutions

With a **Custom Wallpaper** set, screenshots are always composited at 2000 × 1250, so the display limits below apply only without one.

- Due to the limitation of ScreenCapture App and Raycast's main window size being fixed (750 × 475 points as of Raycast 1.104), It only works fine when the actual resolution(Resolution) is two times the view resolution(UI Looks like). You can check the monitor screen information by typing `/usr/sbin/system_profiler SPDisplaysDataType` command in terminal.
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

- _Screenshot Name_: Default is `%e-%i`. Tokens:
  - `%e`: the extension's name, or `Metadata` when the screenshot isn't going to an extension's `metadata` folder
  - `%i`: the lowest number that doesn't match an existing file with the same name and format
  - `%y` `%m` `%d`: year, month, day
  - `%H` `%M` `%S`: hours, minutes, seconds

  Without `%i`, a name that is taken gets `-2`, `-3` and so on.

- _Screenshot Format_:
  - PNG
  - JPEG
  - PDF
  - TIFF
