# Motion Preview

A Raycast extension that previews the animation file currently selected in Finder. Supports Rive (`.riv`), Lottie JSON (`.json`), and dotLottie (`.lottie`).

## How it works

The command grabs the selected file, validates it, and opens it in a floating preview window that plays the animation. The window has a control bar to change the background color, and for Rive files, to switch between state machines.

The TypeScript side handles the Raycast command — getting the selected file and validating it. The Swift side renders the floating preview window and plays the animation.
