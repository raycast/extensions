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

Previews are generated in memory. Copying or opening an image creates a temporary PNG; saving writes directly to the selected destination folder.

The editor uses standard URL parsing and serialization. Hostnames are normalized, default ports are omitted, and path dot segments are resolved. Editing query parameters applies `URLSearchParams` encoding to the query: spaces use `+`, and parameters without an equals sign become `key=`. Duplicate keys, empty keys, empty values, and parameter order are supported. Special characters in Path and Fragment are encoded automatically.

Hierarchical custom URLs such as `myapp://page/path` support component editing. Opaque URLs such as `mailto:hello@example.com` can be inspected and have their query and hash edited; their opaque path cannot be changed by the URL API. You can open up to 20 nested levels, with up to five additional decoding attempts per parameter.

## Timestamps and time zones

Enter a timestamp to update the results immediately. Choose Auto Detect, Seconds, or Milliseconds as the unit. Negative values and fractional seconds are supported.

Auto Detect treats absolute values below `100000000000` as seconds and larger values as milliseconds. Very early or distant dates can be ambiguous, so choose a unit explicitly when needed. All times display millisecond precision; finer fractions are truncated toward zero. BCE dates include their era.

Use the **Time Zones** picker on the same page to choose multiple zones. Search by city or IANA name, such as Shanghai / Asia/Shanghai, UTC, Los Angeles / America/Los_Angeles, or Europe/London. Results update immediately, and selections are saved for the next launch.

The default zones are Shanghai, UTC, and Los Angeles. IANA zones apply daylight saving rules for the input date. Available options come from the time zones supported by the current Node.js runtime.

## Decode clipboard QR codes

The decoder reads the **current system clipboard** and selects the first readable image in pasteboard order. It supports copied screenshots and image files copied in Finder. It does not search Raycast's clipboard history.

Multiple QR codes in the same image appear as separate results. If a result contains a URL, choose **Parse and Edit URL** to open it in the editor. After copying another image, press `⌘R` to read the clipboard again.

QR decoding uses macOS AppKit / Vision through the system's JavaScript for Automation runtime. QR generation uses `qrcode`. No additional downloads or compiler setup are required.

## Base64

Choose Encode or Decode and select Standard Base64 or Base64URL. The result updates immediately when the input, operation, or format changes and can be copied directly. Standard Base64 includes trailing padding; Base64URL omits it. Decoding accepts whitespace and missing padding, and validates characters, padding, trailing bits, and UTF-8 text.

## Official documentation

- [Raycast developer documentation](https://developers.raycast.com/)
- [Clipboard](https://developers.raycast.com/api-reference/clipboard)
- [Preferences](https://developers.raycast.com/api-reference/preferences)

## License

MIT
