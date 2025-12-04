# Split Video Scenes

Split a video into scenes using [scenedetect](https://github.com/Breakthrough/PySceneDetect).

This extension will install `scenedetect` using `pipx` if it is not already installed.

## Usage

After selecting a video file, you can choose the detection method and submit the form.

- Threshold: Detects fades by analyzing frame intensity; ideal for fade-to-black transitions
- Content: Identifies fast cuts by comparing adjacent frames; best for rapid content changes
- Adaptive: Compares frame scores to neighbors; useful for varied scene transition types
