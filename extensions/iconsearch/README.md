# IconSearch for Raycast

Search the live IconSearch catalog from Raycast, then copy or paste production-ready icon snippets into the app in front. A free IconSearch account is required.

## Features

- Secure IconSearch account connection through a browser approval link.
- Live search across 355,702 online icons from named libraries and Iconify collections.
- Raycast-native list UI with inline detail previews, recents, favorites, and a dedicated larger preview page.
- Filter by library, Iconify collection, style, commercial-safety status, and preferred output format.
- Apply common size and color presets directly from the main search toolbar.
- Customize icon size from 8 to 512 pixels and choose a preset or custom hex color.
- Copy or paste React, raw SVG, Vue, Svelte, Tailwind mask snippets, or the SVG URL.
- Copy or paste a customized SVG file into design tools that accept file clipboard data.
- Export and reveal a customized SVG in File Explorer or Finder for drag and drop.
- Uses the authenticated production endpoint at `https://iconsearch.info/api/extension/icon-search`.

## Local Development

```bash
cd raycast-extension
npm install
npm run dev
```

Connect an IconSearch account from the command, approve the browser link, then search for an icon like `home`.

### Test Sign-Up and Connection

1. In the connected Raycast command, press `Ctrl+K` and run **Sign Out of IconSearch** from the **IconSearch Account** section.
2. Sign out of `iconsearch.info` in the browser too. Raycast sign-out revokes only the extension token and intentionally leaves the website session alone.
3. Reopen **Search Icons**. The empty state should show **Sign in or create an account**.
4. Press `Enter` on **Sign In or Create Account**. The secure connection page opens in the browser.
5. Select **Sign in or create a free account**, create the account, and then approve **Raycast Extension**.
6. Return to Raycast. A successful connection toast appears and icon results load automatically.

### Test Customization and Output

1. Select an icon and press `Enter` to open **Customize and Use Icon**.
2. Choose a size, color, and output format.
3. Run **Copy Customized...** and paste into a text editor to inspect generated code.
4. Run **Paste Customized... into Frontmost App** while a compatible editor is active.
5. Run **Copy Customized SVG File**, switch to Figma, Framer, PowerPoint, or another compatible app, and paste.
6. Run **Export Customized SVG for Drag and Drop**. Raycast reveals the file in File Explorer or Finder; drag that file into the target app.

Raycast does not currently expose an API for dragging a native list item directly out of the Raycast window. The revealed-file action provides a real file-based drag workflow without claiming unsupported behavior.

## Publish

```bash
cd raycast-extension
npm run build
npm run publish
```

Before publishing, verify that the `author` field in `package.json` matches the Raycast Store handle for the publishing account.
