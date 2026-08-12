<p align="center">
<img width=100 src="https://github.com/ayarse/raycast-motion-preview/blob/main/assets/command-icon.png?raw=true">
</p>

<h1 align="center">Motion Preview for Raycast</h1>
<h4 align="center">
  <a title="Install Motion Preview Extension" href="https://www.raycast.com/ayarse/raycast-motion-preview"><img src="https://www.raycast.com/ayarse/raycast-motion-preview/install_button@2x.png" style="height: 64px;" alt="" height="64"></a>

Motion Preview is a Raycast extension that allows you to quickly preview modern animation formats. It supports both Lottie (JSON and dotLottie) and Rive file formats.

</h4>

<img src="https://github.com/ayarse/raycast-motion-preview/blob/main/metadata/raycast-motion-preview-2.png?raw=true" style="max-width: 100%" />

---

## Features

- Preview Rive, Lottie (JSON), and dotLottie animations
- Switch between state machines
- Playback and background color controls
- Browse other animations in the same folder

## Installation

The easiest way to install this extension is using the Raycast Store. Alternatively, you can clone this repository and manually install the extension by following these steps.

- Clone this repo `git clone https://github.com/ayarse/raycast-motion-preview`
- Go to the folder `cd raycast-motion-preview`
- Install dependencies `npm install`
- Go to Raycast, run the `Import Extension` command and select the cloned repo folder.

## Usage

1. Select a Lottie JSON, dotLottie, or Rive animation file in Finder.
2. Go to Raycast and run the "Preview Animation" command.
3. Click anywhere or press `Esc` to close the preview.

## Render runtimes

The preview window renders animations inside a `WKWebView` using the official
[`@rive-app/canvas`](https://www.npmjs.com/package/@rive-app/canvas) and
[`@lottiefiles/dotlottie-web`](https://www.npmjs.com/package/@lottiefiles/dotlottie-web)
runtimes. These `.js`/`.wasm` files are **not** bundled with the extension. On
first run they are downloaded from version-pinned jsDelivr URLs, verified
against pinned SHA-256 hashes, and cached under the extension's support
directory — so nothing untrusted is shipped, and after the first download the
preview works fully offline.

The pinned versions and hashes live in [`src/runtimes.ts`](src/runtimes.ts). To
upgrade a runtime, bump its version constant and replace its hashes there.

## Support

For any issues or feature requests, please open an issue on the [GitHub repository](https://github.com/ayarse/raycast-motion-preview).

## License

This project is licensed under the MIT License.
