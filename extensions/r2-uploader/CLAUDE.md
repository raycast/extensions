# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Raycast extension ("Cloudflare R2 File Uploader") with two commands:
- `r2-uploader` (no-view): uploads the Finder-selected file to a Cloudflare R2 bucket (via the S3-compatible API),
  optionally converts images to AVIF first, and copies the resulting link (plain URL, Markdown, or HTML, per
  preference) to the clipboard.
- `browse-r2-files` (view): a folder/file browser for the same bucket — navigate folders, preview files (images
  inline via a signed URL), copy links, and delete files.

## Commands

```bash
npm run dev        # ray develop — runs the extension in Raycast for local testing
npm run build       # ray build — production build / validation
npm run lint         # ray lint
npm run fix-lint     # ray lint --fix
npm run publish       # publish to the Raycast Store (npx @raycast/api@latest publish)
```

There is no test suite. `ray build`/`ray lint` (both wrappers around `@raycast/api`'s CLI) are the primary
correctness checks — they type-check against `raycast-env.d.ts` and validate the extension manifest.

Neither command can be run as a plain Node script (one is a no-view command driven by Finder selection, the other
is a Raycast React view) — use `npm run dev`, which registers both commands with the local Raycast app so they can
be invoked from the Raycast UI, and hot-rebuilds (including regenerating `raycast-env.d.ts`) on file changes.

## Architecture

Entry point: `src/r2-uploader.ts` (`Command()`), wired up via the single command entry in `package.json`
(`commands[0].name === "r2-uploader"`). Flow on invocation:

1. Read preferences via `getPreferenceValues()` (typed by the auto-generated `raycast-env.d.ts`, which mirrors
   `package.json`'s `preferences` array — do not hand-edit `raycast-env.d.ts`; change `package.json` instead and
   let Raycast regenerate it).
2. Bail out with a toast (and a button to open extension preferences) if required R2 credentials aren't set.
3. Get the selected file from Finder via `getSelectedFinderItems()` — only the first selected item is used.
   `getSelectedFinderItems()` throws if Finder isn't the frontmost app; this is caught separately and surfaced as
   a friendly toast rather than falling through to the generic error handler.
4. If the file is an image format AVIF-conversion supports (`isSupportedImageFormat` in
   `src/utils/mime-types.ts`) and the "Convert to AVIF" preference is on, shell out to `avifenc`
   (`src/utils/convert.ts`) to produce a sibling `.avif` file. The `avifenc` binary is an external dependency
   (`brew install libavif`); its path is configurable and falls back to `AVIFENC_DEFAULT_PATH` in
   `src/utils/constants.ts`.
5. If a custom filename format preference is set, render it via `generateFileName` (`src/utils/generate-fileName.ts`).
6. Upload via `uploadToR2` (`src/utils/uploadToR2.ts`), which builds an `@aws-sdk/client-s3` `S3Client` pointed at
   R2's S3-compatible endpoint (`https://{accountId}.r2.cloudflarestorage.com`, `forcePathStyle: true`,
   `region: "auto"`) and issues a `PutObjectCommand`. The object key is the final filename, optionally prefixed
   with a rendered "Upload Path Prefix" folder path (`buildObjectKey` in `uploadToR2.ts`) so files can be stored
   under a folder instead of the bucket root. Content-Type is derived from the file extension via the static
   lookup table in `src/utils/mime-types.ts`.
7. Build the final URL — prefixed with the custom domain preference if set, otherwise the raw R2 endpoint/bucket
   URL — and copy the plain URL, a Markdown `![alt](url)` link, or an HTML `<img>` tag to the clipboard depending
   on the "Link Format" preference (`url` / `markdown` / `html`).

Notes on templating: both the filename format (`generateFileName`) and the upload path prefix (`buildObjectKey`)
share the same token renderer, `renderTemplateTokens` in `src/utils/generate-fileName.ts` — it does string
`.replace()` of `{name}`, `{ext}`, `{year}`, `{month}`, `{day}`, `{hours}`, `{minutes}`, `{seconds}` placeholders,
formatting the timestamp with `dayjs` (uppercase tokens: `YYYY`/`MM`/`DD`/`HH`/`mm`/`ss`). `generateFileName`
additionally always forces the final extension to match the original (or a passed-in `customExtension`),
overriding whatever extension the format string produced. `buildObjectKey` strips empty/`.`/`..` path segments
from the rendered prefix as a basic guard against writing outside the intended folder.

### Per-invocation upload folder (sticky argument)

The command also takes an optional Raycast `folder` argument (see `arguments` in `package.json`, resolved via
`resolveUploadFolder()` in `src/r2-uploader.ts`) that overrides the static "Upload Path Prefix" preference for one
run and is then "sticky": it's persisted to `LocalStorage` (key `uploadFolder`) so the *next* invocation reuses it
even with the argument left blank, and the command's subtitle in Raycast's root search is updated via
`updateCommandMetadata()` to always show the currently active folder (or the default subtitle when unset/reset)
— this exists specifically so a forgotten sticky folder is visible before upload, not discovered after. Typing
`/` or `root` clears the sticky value and resets the subtitle, returning `undefined` (not `""`) so the next
upload falls back to the `uploadPathPrefix` preference rather than force the bucket root regardless of that
preference — a folder reset should mean "stop overriding," not "ignore my configured default folder too." The
resolved folder is passed as `pathPrefixOverride` to `uploadToR2()`, taking priority over the `uploadPathPrefix`
preference; leaving both the argument and sticky storage empty (including after a reset) falls back to that
preference (or bucket root if it's unset too).

### Shared R2 client/URL helpers

Both commands build their S3 client via `createR2Client()` (`src/utils/r2-client.ts`) and build the public-facing
URL for a key via `buildPublicUrl()` (`src/utils/r2-url.ts`) — `uploadToR2.ts` and `browse-r2-files.tsx` both import
these rather than duplicating the endpoint/credentials/custom-domain logic. `buildPublicUrl()` percent-encodes each
`/`-separated segment of the key (`encodeURIComponent` per segment, not the whole key) so keys containing spaces,
`#`, `?`, or non-ASCII characters still produce a URL that addresses the right object, while `src/utils/text-escaping.ts`
(`escapeMarkdownAlt`/`escapeHtmlAttribute`) is used everywhere a filename is interpolated into generated Markdown/HTML
output, since an unescaped `]`, `"`, or `<` in a filename would otherwise break or inject into the copied snippet.

### `browse-r2-files.tsx`

A recursive Raycast `List` view: `FolderView({ prefix })` lists the current "directory" via `listR2Entries()`
(`src/utils/r2-objects.ts`), which pages through `ListObjectsV2Command` with `Delimiter: "/"` (following
`NextContinuationToken` until `IsTruncated` is false, so folders with more than one page of 1,000 keys aren't
silently truncated) — `CommonPrefixes` become folder rows, `Contents` become file rows (sorted newest-first by
`LastModified`). Selecting a folder pushes a new `FolderView` with the deeper prefix via `useNavigation().push()`,
so back-navigation is Raycast's built-in behavior rather than custom state. Only file rows get a
`List.Item.Detail`; `FilePreviewDetail` fetches a short-lived signed GET URL via `getPreviewUrl()`
(`src/utils/r2-preview.ts`, using `@aws-sdk/s3-request-presigner`) and renders it as a Markdown image for image
MIME types (`isImageMimeType()` in `mime-types.ts`) — this works regardless of whether the bucket/custom domain is
actually publicly reachable, unlike reusing `buildPublicUrl()` for previews. Deleting a file calls
`deleteR2Object()` after a destructive `confirmAlert()`, then calls the `usePromise` `revalidate()` to refresh the
current folder's listing. Deleting a *folder* is a distinct, higher-blast-radius flow (`handleDeleteFolder`): it
first recurses through every page of `listAllKeysUnderPrefix()` (no `Delimiter`, so it walks into subfolders too)
to get an exact file count, shows that count in the `confirmAlert()` message before anything is deleted, then
batches the deletes via `deleteR2Objects()` (`DeleteObjectsCommand`, chunked at 1000 keys per request — S3's
per-call limit). `DeleteObjectsCommand` can report individual key failures in its `Errors` array without the
request itself rejecting, so `deleteR2Objects()` collects those and throws if any are present, rather than
reporting success when some files were left behind (e.g. due to a permissions/retention issue on specific keys);
the UI still calls `revalidate()` in a `finally` regardless, since earlier chunks may have partially succeeded.

Note: `@aws-sdk/s3-request-presigner` must stay version-pinned to match `@aws-sdk/client-s3` (both currently
`3.864.0`) — a newer presigner against an older client-s3 fails to type-check (`S3Client` structurally
incompatible with the presigner's expected `Client` type across `@smithy/*` versions).

## Preferences / config surface

All user-facing configuration lives in `package.json`'s `preferences` array (bucket name, access key, secret key,
account ID, custom domain, filename format, upload path prefix, AVIF toggle + path + quality, link format
dropdown). When adding or renaming a preference, update `package.json` and let Raycast regenerate
`raycast-env.d.ts` — don't edit the generated types by hand.

## Code style

- Formatting is enforced by Prettier (`.prettierrc`: 120 print width, double quotes).
- Linting extends `@raycast/eslint-config` (`eslint.config.js`) — this is the canonical style/correctness gate,
  not a custom ruleset.
- `tsconfig.json` runs in `strict` mode targeting ES2023/ESM (`"type": "module"` in `package.json`).
