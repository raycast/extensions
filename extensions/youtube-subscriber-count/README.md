# YouTube Subscriber Count - Raycast Extension

<img src="./assets/command-icon.png" alt="YouTube Subscriber Count" width="200"/>

## Description

This Raycast extension enhances the YouTube content creator experience by providing live updates on channel subscribers and launches a confetti whenever you get a new subscriber. It displays your channel's current subscriber count as a [MenuBar](https://developer.apple.com/design/human-interface-guidelines/the-menu-bar)

## Setup

To use this extension, you'll need a YouTube API key:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable the YouTube Data API v3.
3. Create an API key for your project.
4. In Raycast preferences, locate the YouTube Subscriber Count extension and input your YouTube API key.
5. Also you need the channel id. Follow [this guideline](https://support.google.com/youtube/answer/3250431?hl=en) to find your channel ID, it's something like `UCLtLg_CkuGBnf_-wUHnv6Nw`

## Usage

After installation and setup:

- The extension will automatically display your current subscriber count.
- When your channel reaches a new milestone (with a customizable threshold), a celebratory alert (confetti burst) will appear (it checks with a customizable interval, for example every 1 minutes)
- Access your YouTube dashboard or channel with a single click for more detailed analytics.

## Assets

Logo is created using [raycast logo generator](https://icon.ray.so/) tool, you can find the exact logo using [this link](https://icon.ray.so/?fileName=extension_icon&icon=add-person&backgroundRadius=128&backgroundStrokeSize=0&backgroundStrokeColor=%23FFFFFF&backgroundRadialGlare=true&backgroundNoiseTexture=false&backgroundNoiseTextureOpacity=25&backgroundStrokeOpacity=100&iconColor=%23FFFFFF&iconSize=352&selectedPresetIndex=null&customSvg=undefined&backgroundFillType=Solid&backgroundStartColor=%23860000&backgroundEndColor=%23FF0000&backgroundAngle=45)
