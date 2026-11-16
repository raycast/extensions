<div align="center">
  <img src="./media/icon.png" alt="Xeet" width="100" />
  <h3>Xeet</h3>
  <p>Create X post previews in Raycast</p>
</div>

Xeet is a Raycast extension that renders custom text, structured JSON, and public X posts as PNG previews. You can compare layouts, save drafts, and copy or export the images. Custom text and JSON render entirely on your computer.

Previews use Xeet's bundled fonts and emoji. They are mockups, not evidence of an authentic published post.

## Commands

| Command                | Use                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create Post Preview    | Compose text, choose an author and avatar, set badges and counts, and generate a preview. Includes a weighted character count, presets, and Save Draft. |
| Render X Post          | Paste a public X/Twitter post URL, plain text, or a Xeet Post JSON object. Clipboard text prefills the form when enabled.                               |
| Compare Post Layouts   | Compare light/dark themes, four web/iOS surfaces, 320/390/600px widths, 1×/2×/3× resolution, or collapsed/expanded text.                                |
| Saved Drafts           | Reopen, edit, compare, and delete saved posts. The most recent 50 drafts are retained locally.                                                          |
| Quick Render Clipboard | Immediately render clipboard text or JSON, or resolve a public X post URL. An empty/unsupported clipboard opens a form with recovery instructions.      |

Author images accept local PNG, JPEG, and WebP files up to 8 MB. Verification options are none, blue, business, and government. Square avatars, reply context, timestamps, and replies/reposts/likes/views/bookmarks are supported. The character limit warning does not prevent previewing a longer post.

The default author, theme, surface, width, resolution, clipboard prefill, automatic draft history, and export directory can be changed in extension preferences. The default export directory is Downloads. Layout selections are remembered; Follow Raycast continues to use Raycast's appearance.

## Preview and export

The native Detail view displays the PNG, pixel dimensions, Xeet's weighted character count, truncation state, surface, and resolver warnings.

| Action           | macOS    | Windows      |
| ---------------- | -------- | ------------ |
| Copy PNG         | Return   | Return       |
| Save PNG         | ⌘ Return | Ctrl Return  |
| Edit Post        | ⌘ E      | Ctrl E       |
| Switch Theme     | ⌘ T      | Ctrl T       |
| Compare Variants | ⌘ ⇧ V    | Ctrl Shift V |

Return also copies the PNG in the preview. File reveal actions use Finder on macOS and File Explorer on Windows.

The action panel also offers expansion, Save Draft, Copy Post Text, and Copy Post JSON. Exports use unique filenames and never overwrite an existing file.

The comparison gallery uses `renderMany()` for each selected dimension. **Export Web Timeline Theme and Width Sheet** uses Xeet's `sheet()` to export six labeled, collapsed Web Timeline previews (320/390/600px × light/dark) at the chosen resolution. The sheet API does not support alternate surfaces or expanded text; those variants can be exported individually from the gallery.

## Raycast AI

Mention **@xeet** in Raycast AI to create previews, render text/JSON/public URLs or your clipboard, inspect weighted counts and Show more, compare layouts, manage saved drafts, and copy or export PNGs.

Examples:

- `@xeet Create a dark preview saying "Hello Raycast!" by @xeet with a blue badge.`
- `@xeet Render my clipboard and copy the PNG.`
- `@xeet Compare "Ship it 👋" on all four surfaces.`
- `@xeet What is the weighted character count of "Hello 👋 https://example.com"?`
- `@xeet Change my "Launch tomorrow" draft to "Launching today" and keep its attachments.`

Eight tools cover these workflows: `create-post-preview`, `render-post`, `inspect-post`, `compare-post-layouts`, `list-drafts`, `save-draft`, `delete-draft`, and `export-preview`. Rendering returns a temporary PNG link; copying and saving use the returned preview ID. Saved drafts share the command's local store. AI saves happen only when requested, identical new saves are deduplicated, and saving, deletion, copying, and exporting ask for confirmation. Text-only draft edits preserve the author, attachments, and saved appearance.

Raycast AI processes the conversation and tool inputs/results according to your Raycast AI settings. The renderer itself runs locally; public X URL resolution is the same bounded network operation used by the commands. Local rendering does not imply that an AI conversation stays on-device.

## Post JSON

Paste a Post object, not a resolver response envelope:

```json
{
  "text": "Hello from Raycast! 👋",
  "author": {
    "name": "Your Name",
    "handle": "yourhandle",
    "verified": "blue"
  },
  "counts": { "likes": 42, "views": 1200 },
  "createdAt": "2026-11-16T09:00:00Z",
  "now": "2026-11-16T10:00:00Z"
}
```

The upstream Post schema supports media, nested quotes, polls, and link cards. Images in JSON must already be base64 bytes; JSON and text inputs never fetch their embedded links. Existing attachments are preserved when you edit a resolved post or draft. Copy Post JSON and use Render X Post to edit structured attachments.

## Public posts, privacy, and limits

- Only complete HTTPS `x.com` and `twitter.com` status URLs are accepted for resolution. Tracking parameters and photo/video suffixes are normalized to the post ID.
- Requests go directly to X and an explicit set of its media hosts. There is no third-party resolver, authentication, cookie access, or private-post support. External link-card crawling is disabled.
- Resolution is best-effort: deleted/private posts, rate limits, X changes, or missing metadata can cause errors. The extension suggests retrying or pasting text/JSON. It never substitutes invented post content. Missing media is reported through upstream warnings/placeholders.
- DNS checks apply both to Xeet's resolver and to the actual network connection. Private, loopback, link-local, multicast, and other special-use addresses are rejected. Requests have an 8-second timeout, a 20-second overall cancellation signal, at most 30 requests and five redirects, and bounded streaming downloads (8 MB per response, 48 MB per resolution).
- Successful resolutions are cached for 15 minutes, with at most ten entries of up to 16 MB each. Expired entries are removed on the next URL resolution, including cache hits. **Clear Cached Posts** in the input command's action panel removes them immediately.
- PNGs live in Raycast's support directory and are removed after 24 hours on the next render. Saved drafts intentionally retain their content and media until deleted or displaced by the 50-draft limit. Large draft content stays in support-directory files; only titles, IDs, and saved times use LocalStorage.
- Render dimensions, image sizes, quote depth, JSON shape, and other limits are also validated by Xeet. Unsupported inputs fail rather than being silently clipped. Newer emoji and some scripts may lack glyphs in the pinned fonts.
- Nothing posts to X. X account management is outside this implementation.

## Renderer, fonts, and attribution

Built on [rauchg/xeet](https://github.com/rauchg/xeet), installed through the pinned `@xeet/core` npm dependency. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for attribution. This extension is MIT licensed and is not affiliated with X.

## Development

Run `npm ci`, then `npm run dev`. Installation prepares the npm renderer's WASM and font packs in the ignored `assets/xeet-runtime/` directory so Raycast can include them in the extension. `npm run build` and `npm run dev` refresh these generated files automatically; no custom Rust build or checked-in renderer binaries are needed.

Run `npm test`, `npm run build`, and `npm run test:bundle` to check rendering and the relocated production distribution.
