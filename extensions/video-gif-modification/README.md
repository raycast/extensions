# Video/GIF Modification

The extension allows you to optimize, convert and resize video and gif files using ffmpeg. At the moment the extension only works with a selection in the Finder.

On first run, the extension will download the ffmpeg and ffprobe binaries from https://www.osxexperts.net.

## Available Commands

### Convert

The command takes no arguments and encodes the file in the selected folder.

There are currently 3 formats available for conversion: mp4, webm and gif.

### Optimize

The command allows you to optimize the selected video according to the selected template. There are 3 templates available: lighter weight, optimal and best quality. Under the hood, these settings affect the bitrate. GIFs are not currently supported for optimization.

Optimization takes place according to 3 different strategies: smallest size, optimal and best quality. In each strategy, the extension optimizes the bitrate of the final video. The audio remains untouched.

### Resize

Specify width or height. If one of them is not specified, the other will be calculated automatically to maintain the aspect ratio of the original.

For example, if the source video is 1920x1080 and you specify 1280 as the width, the height will automatically be set to 720. And vice versa.
