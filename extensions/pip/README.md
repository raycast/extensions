# PiP

Watch video in Picture in Picture or Fullscreen mode.

## Description

**Toggle Picture in Picture** is inspired by [PiPifier](https://apps.apple.com/cn/app/pipifier/id1160374471?l=en-GB&mt=12) that lets you use every HTML5 video in Picture in Picture mode.

**Toggle Full Screen** is inspired by [Fullifier](https://apps.apple.com/cn/app/fullifier/id1532642909?l=en-GB) that lets you play every HTML5 (thats about every web video) video in the native browser fullscreen video player.

## Supported Apps

- ✨ Support **Safari**, **Chrome**, **Edge** and other Chromium, Webkit-based browsers

- ✨ Support **IINA**. This is achieved by simulating the pressing of shortcut keys

- 🚨 Not Support Gecko-based browsers such as **Firefox** is not supported

- 🚨 Not Support **Opera**, It does not provide the ability for Apple Event to run javascript

## Setup before using

- To use this extension in browsers, you need to turn on Developer Mode and tick the box in Developer: Allow JavaScript from Apple Events.

- ~~To use PiP just run the Toggle Pip command when you're watching to an HTML5/IINA video (Note: You need to interact with the video once. If it's autoplaying just pause and play again)~~

- ~~Also, when you call this command repeatedly, you need to make sure that you have manually clicked on the video element in the browser page before each run (this is a limitation from browsers)~~

- I solved the above two problems by a hacker way to simulate pressing the keyboard (F1 by default) in a Chromium based browser for automated picture-in-picture or full screen mode. If there is a conflict with the keystrokes, please select another keystroke or No Simulate in the extension settings.

✨ **How to Allow JavaScript from Apple Events** ✨

To use this extension in **Safari**, you need to turn on Developer Mode and tick the box in Developer: Allow JavaScript from Apple Events.

- Open Safari Settings
- In Advanced, tick the box in Show features for web developers

  ![safari-developer](https://github.com/raycast/extensions/assets/36128970/9f06aab1-6cfa-41d3-8807-137da4bc054c)

- In Developer, tick the box in Allow JavaScript from Apple Events

  ![safari-setting](https://github.com/raycast/extensions/assets/36128970/713f2fa6-f201-4ba3-86de-f22f5eaca6c2)

To use this extension in **Chrome**, **Arc**, Please go to **View** > **Developer** > **Allow JavaScript from Apple Events** in the menu bar.

![chorme-setting](https://github.com/raycast/extensions/assets/36128970/8ca1ff12-2734-437b-869d-292264218f36)

To use this extension in **Edge**, Please go to **Tools** > **Developer** > **Allow JavaScript from Apple Events** in the menu bar.

![edge-setting](https://github.com/raycast/extensions/assets/36128970/fbd1881c-9f32-44a6-8946-7d5b7f670859)
