# CloudFlareImgbed

A Raycast extension tailored for https://github.com/MarSeventh/CloudFlare-ImgBed.

## Features

- Upload images to the ImgBed instance.
- List images stored in the ImgBed.
- Manage and filter existing uploads.
- Delete images with confirmation.

## High-Level Plan

| Module              | Responsibility                               | Notes                                                                                             |
| ------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Gallery command     | Browse, search, filter, and delete images    | Supports directory/tag/channel filters; action panel offers copy links, open in browser, push detail, delete |
| Clipboard uploader  | Parse images or URLs from the clipboard      | Shows an error when the clipboard contains invalid data; the form lets you override upload params |
| Manual uploader     | Pick local files and upload immediately      | Action panel exposes Copy URL / Markdown / HTML                                                   |

### Raycast Preferences

| Key              | Default   | Description                                              |
| ---------------- | --------- | -------------------------------------------------------- |
| `apiBaseUrl`     | -         | CloudFlare ImgBed domain, trailing slash is trimmed      |
| `apiToken`       | -         | Auth token used as `Authorization: Bearer <token>`       |
| `defaultDir`     | `""`      | Default directory for the list command                   |
| `defaultChannel` | `""`      | Default filter channel (`telegram` / `cfr2` / `s3`)      |
| `pageSize`       | `50`      | `count` parameter for the list command                   |
| `uploadChannel`  | `telegram`| Upload channel                                           |
| `uploadFolder`   | `""`      | Default folder applied on upload                         |
| `uploadNameType` | `default` | Naming strategy (`default` / `index` / `origin` / `short`) |
| `returnFormat`   | `default` | Link format (`default` or `full`)                        |
| `serverCompress` | `true`    | Compress images when uploading via Telegram channel      |
| `autoRetry`      | `true`    | Retry with other channels when upload fails              |

If any form field in a command is left blank, the preference fallback will be used. This keeps global defaults consistent while still allowing ad-hoc overrides.

### API Design Notes

- Base endpoints follow https://cfbed.sanyue.de/api/:
  - Upload: `POST /upload` (multipart)
  - List: `GET /api/manage/list`
  - Delete: `DELETE /api/manage/delete/{path}` (client can fall back to GET when necessary)
- `ImgBedClient` is responsible for:
  - Building URLs, appending query strings, and injecting Authorization headers
  - Retrying non-network failures up to 3 times, surfacing network errors immediately
  - Parsing common errors and surfacing them through Raycast toasts
- Data modeling: the `metadata` field is mapped into strongly typed objects (size, timestamp, channel, etc.) for the gallery detail panel.

### UI / Interaction Notes

- Gallery command:
  - Use Raycast `List` + `useCachedPromise` for loading/error states.
  - Combine search bar + action panel form to filter by directory/tag/channel.
  - `Action.Push` opens a detail view showing size/time/channel plus copy actions.
  - Always show a `confirmAlert` before deletion, fire success/failure toasts, and refresh data.
- Upload command:
  - The form includes all overridable upload params.
  - After success, automatically present URL / Markdown / HTML copy actions.
- Clipboard upload:
  - Supports image files and image URLs; show a toast when detection fails.

### Planned Directory Layout

```
src/
  api/          // ImgBedClient, request helpers
  commands/     // list.tsx, upload.tsx, upload-from-clipboard.tsx
  components/   // GalleryItem, DetailView, FilterForm, UploadForm
  hooks/        // useImgBedList, useUpload
  types/        // DTOs, preference types, response models
  utils/        // Shared helpers (retry, formatting, clipboard, etc.)
```

> The project is still evolving. This breakdown guides future work, including adding random image and indexing features without disrupting the structure.
