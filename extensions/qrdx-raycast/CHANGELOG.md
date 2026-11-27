# QRdx Changelog

## [Initial Version] - {PR_MERGE_DATE}

- **Generate QR:** make a QR code from a URL, an email address, a phone number or any text. Pick the body pattern, eye frame, eye center and call-to-action frame from previews (⌘1 to ⌘4), and set the foreground, background, eye and center colors, the frame's label and colors, error correction, a logo, the size and the quiet zone. The patterns and frames are the ones the `qrdx` library offers.
- **The code's preview:** copy the code as PNG or SVG, save either to your Downloads folder, save its settings to Saved QR Codes, or open it in the QRdx Playground (⌘O). After Generate, Edit (or Esc) goes back to the form with your settings. A logo given by its address is loaded and drawn into the code.
- **Saved QR Codes:** browse your saved codes with a preview and the settings of the selected one beside the list, then edit, export or delete them. They're kept in Raycast's local storage.
- **Generate QR with AI:** describe the code you want and Raycast AI fills in the settings. When the description doesn't say what to encode, you can enter it yourself or revise the description. Needs access to Raycast AI.
- **Dynamic QR Codes:** with a QRdx API key, browse your workspace's dynamic codes in their own designs, see each one's scans (with countries, cities, devices, systems, browsers and referrers), change where it points, copy its short link, and copy or save it as PNG or SVG.
- **Create Dynamic QR Code:** make a dynamic code in your QRdx workspace, with its default design.
- **Raycast AI tools:** ask Raycast AI for a code and it saves the PNG to your Downloads folder, or ask it to list and search your saved codes. With an API key, it also creates dynamic codes, lists them, reads their scans and changes their destinations, after you confirm.
