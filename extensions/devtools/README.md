# DevTools for Raycast

A macOS Raycast extension with five everyday developer tools. All processing runs locally.

Launch a command in Raycast to get started. No API keys or additional setup are required. The URL editor supports recursively nested URLs: changes are re-encoded and propagated to the outermost URL, which can be turned into a QR code directly.

| Command                | Features                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| URL to QR Code         | Generate a QR code from a URL, preview it, copy the image, or save a 512 × 512 PNG              |
| Decode QR Code         | Decode QR codes in the first clipboard image, including screenshots and image files             |
| Parse and Edit URL     | Inspect URL components, add, edit, or delete query parameters, and recursively edit nested URLs |
| Parse Timestamp        | Parse timestamps in seconds or milliseconds and show times in multiple configurable time zones  |
| Base64 Encode / Decode | Convert UTF-8 text to and from Base64 or Base64URL, including Unicode text and emoji            |

## Run locally

Install Raycast, Node.js 22 or later, and Apple's Command Line Tools, which compile the native QR clipboard helper.

```sh
npm install
npm run dev
```

`npm run dev` compiles the macOS QR helper, imports the extension into Raycast, and watches for source changes. Search for the commands above or use keywords such as `qrcode`, `timestamp`, `query`, and `base64`. All command titles and interfaces are in English.

If Apple's Command Line Tools are missing, install them with:

```sh
xcode-select --install
```

The URL, Timestamp, and Base64 commands accept optional arguments in Raycast's root search. When no input is supplied, they try to read the current clipboard text. URL and Timestamp only use clipboard content that matches their expected format. Manual input is also available.

After you submit an argument in root search, the command processes it and shows the result directly. Valid clipboard input is also processed automatically. URL commands show an input form when valid input is missing. Base64 converts text immediately as you change the input, operation, or format; you can also choose Encode or Decode in root search.

## Edit URLs

1. Enter a URL in root search, or copy a URL and launch the command, to open the editor directly. Standard URLs such as `https://…` and custom protocols such as `myapp://…` are supported.
2. Edit Protocol, Hostname, Port, Path, and Fragment / Hash directly. Each query key appears as the label on the left, with its editable value on the right. The full URL updates immediately.
3. Press `⌘N` or choose **Add Query Parameter** from the `⌘K` action menu to add a key and value. Focus a parameter value and press `⌃X`, or choose **Delete <key>**, to delete it. Press `⌘E` or choose **Rename <key>** to change its key. All changes update the full URL immediately.
4. If a value contains a URL, focus that parameter and press `⌘↵` to open the next level. When there is only one nested URL, **Open Nested URL** or `⌘↵` opens it directly. With multiple nested URLs, each parameter has its own action in the action menu. Nested URLs use the same editor and support multiple layers of percent encoding.
5. Valid changes to a nested URL are immediately re-encoded and written back to its parent parameter. Press `Esc` to return; no separate save step is needed. Invalid fields show an error and keep their last valid value until corrected.
6. Choose **Generate QR Code** from the `⌘K` action menu to preview the edited URL as a QR code. From a nested editor, choose **Generate QR Code for Full URL** to use the updated outermost URL. The preview supports copying the image and saving a PNG. Press `Esc` to continue editing.

QR previews display an embedded PNG at a fixed size of 280 × 280. Long URLs can be scrolled below the image. Copying and saving use the original 512 × 512 image.

The editor supports duplicate keys, empty keys, empty values, and parameters without an equals sign. Unchanged components and parameters retain their original encoding and order. Edited parameters use query encoding rules, and special characters in Path and Fragment are encoded automatically. You can open up to 20 nested levels, with up to five additional decoding attempts per parameter.

## Timestamps and time zones

Enter a timestamp to update the results immediately. Choose Auto Detect, Seconds, or Milliseconds as the unit. Negative values and fractional seconds are supported.

Auto Detect treats absolute values below `100000000000` as seconds and larger values as milliseconds. Very early or distant dates can be ambiguous, so choose a unit explicitly when needed. All times display millisecond precision.

Use the **Time Zones** picker on the same page to choose multiple zones. Search by city or IANA name, such as Shanghai / Asia/Shanghai, UTC, Los Angeles / America/Los_Angeles, or Europe/London. Results update immediately, and selections are saved for the next launch.

The default zones are Shanghai, UTC, and Los Angeles. IANA zones apply daylight saving rules for the input date. Available options come from the time zones supported by the current Node.js runtime.

## Decode clipboard QR codes

The decoder reads the **current system clipboard** and selects the first readable image in pasteboard order. It supports copied screenshots and image files copied in Finder. It does not search Raycast's clipboard history.

Multiple QR codes in the same image appear as separate results. If a result contains a URL, choose **Parse and Edit URL** to open it in the editor. After copying another image, press `⌘R` to read the clipboard again.

QR decoding uses macOS AppKit / Vision, and generation uses `qrcode`. The compiled native helper runs from the extension's assets without launching the Swift compiler at runtime.

## Base64

Choose Encode or Decode and select Standard Base64 or Base64URL. The result updates immediately when the input, operation, or format changes and can be copied directly. Standard Base64 includes trailing padding; Base64URL omits it. Decoding accepts whitespace and missing padding, and validates characters, padding, trailing bits, and UTF-8 text.

## Checks and builds

```sh
npm run typecheck
npm test
npm run lint:local
npm run build
```

The tests cover nested URL updates, encoding preservation, Base64 Unicode round trips, timestamp units and daylight saving rules, and native decoding of generated QR PNGs. QR tests read temporary files and do not modify the system clipboard.

`npm run lint` also validates Store metadata and the Raycast author account. `lint:local` checks code and formatting with Raycast's official ESLint configuration and Prettier.

`npm run build` writes the optimized distribution to `dist`. To load the optimized build into your local Raycast installation for testing, stop the development watcher and run `npx ray build -e dist` without an output path. Run `npm run dev` when you want to resume development.

The native helper is bundled as a universal executable for Apple Silicon and Intel Macs at `assets/qr-helper`. Its complete source is in `native/qr-helper.swift`. `npm run build:native` compiles both architectures with Apple's Swift compiler, combines them with `lipo`, and applies and verifies an ad hoc signature. Development and distribution builds rebuild it when the source or build script changes. Store users do not need a Swift compiler.

## Publish to the Store

```sh
npm run publish
```

The publishing command prepares the native helper and opens a pull request in Raycast's public `raycast/extensions` repository. The extension becomes available in the Store after Raycast reviews and merges the pull request.

## Official documentation

- [Raycast developer documentation](https://developers.raycast.com/)
- [Clipboard](https://developers.raycast.com/api-reference/clipboard)
- [Preferences](https://developers.raycast.com/api-reference/preferences)

## License

MIT
