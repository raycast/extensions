# Webcam QR Scanner

Webcam QR Scanner lets you scan physical QR codes with your Mac's webcam from inside Raycast. It can read regular text QR codes, open links from URL QR codes, detect Wi-Fi network QR codes, and keep a local history of recent scans.

## What It Does

- **Scan QR codes with your webcam:** Open the scanner, point a QR code at your camera, and Raycast shows the decoded result.
- **Open links from QR codes:** When the QR code contains an `http` or `https` URL, you can open it directly in your browser.
- **Use Wi-Fi QR codes:** When the QR code contains Wi-Fi network details, you can view the network name, copy the password, or try connecting to the network from Raycast.
- **Keep QR code history:** Previously scanned QR codes are saved locally so you can view, copy, reopen, delete, or clear them later.

## How to Use

### Scan a QR Code

1. Run **Scan QR Code** in Raycast.
2. If macOS asks for Camera permission, allow Raycast to use the camera.
3. Hold a QR code in front of your webcam until the extension detects it.
4. Choose the relevant action:
   - **Open in Browser** for URL QR codes
   - **Copy to Clipboard** for text QR codes
   - **Connect to Network**, **Copy Network Name**, or **Copy Password** for Wi-Fi QR codes

### View QR Code History

1. Run **Scan History** in Raycast.
2. Select a previous scan to view its details.
3. Use the actions to copy the content, open a link, delete one entry, clear all history, or start a new scan.

## Camera Permission

The first time you scan, macOS may ask for Camera permission for Raycast. Granting this permission allows the extension to read frames from your webcam.

If scanning does not start, open **System Settings → Privacy & Security → Camera** and make sure Raycast is enabled.

## Wi-Fi QR Codes and the Keychain Prompt

Wi-Fi QR codes can contain the network name, security type, password, and hidden-network flag. When you choose **Connect to Network**, the extension uses macOS' built-in `/usr/sbin/networksetup` tool to join the network.

macOS may show a dialog that says `networksetup` wants to access the System keychain. This prompt comes from macOS' own networking tool, not from this extension.

You can click **Deny** on that dialog. The extension passes the Wi-Fi password from the QR code directly to `networksetup`; it does not need Keychain access to read passwords, and denying the prompt does not grant the extension any extra access. If macOS still refuses to connect, you can use the **Copy Network Name** and **Copy Password** actions and join the network manually from System Settings.

This extension does not use Raycast's Keychain API and does not ask Raycast for Keychain Access.

## Privacy

Scanning happens locally on your Mac:

- Camera frames are processed by the bundled native helper and decoded locally in Raycast.
- QR contents are not sent to any external service.
- Scan history is stored locally in Raycast's extension storage.

Be aware that QR codes can contain sensitive data, including Wi-Fi passwords. If you scan sensitive codes, use **Delete** or **Clear All History** from the **Scan History** command when you no longer need them.

## Native Camera Helper

Raycast extensions run in a JavaScript environment, so this extension includes a small macOS helper to access the webcam through AVFoundation. The helper is built from the included Swift source file at `swift/CaptureFrame.swift`.

The compiled helper in `assets/capture-frame` is a universal macOS binary for Apple Silicon and Intel Macs. It is reproducible with:

```bash
npm run build-swift
```

No binary is downloaded at runtime.

## Troubleshooting

- **Camera keeps loading:** Check Raycast's Camera permission in System Settings.
- **No camera found:** Connect an external webcam or open your MacBook lid.
- **A QR code is not detected:** Hold the QR code steady, improve lighting, and make sure the full code is visible.
- **Wi-Fi connection fails:** Copy the network name/password from the result view and join manually from System Settings.
