<div align="center">

<a href="https://www.ygeeker.com">
  <img width="180" src="assets/extension-icon.png">
</a>

<h1 align="center">R2 Media Uploader</h1>

[简体中文](./README.zh-CN.md) | **English**

A Raycast extension to upload **files (Finder selection)** or **media from clipboard** to **Cloudflare R2**, then **copy the final URL**.

</div>

### Features

- **Upload selected Finder files**: supports multiple files (uploads sequentially)
- **Upload from clipboard**: image data or a copied file (great for videos)
- **Bucket + domain picker**: shown on every upload
- **Copy format**: copy as **URL**, **Markdown**, or **HTML**
- **Remembers last choice**: bucket + domain are memoized for the next upload
- **Auto-copy URL(s)**: copies the final URL(s) to clipboard (newline-separated for multi-file uploads)
- **Flexible key/filename formatting**: set folder + filename templates (defaults work well)

### Installation

- Install from Raycast Store (once published), or run locally:

```bash
npm install
npm run dev
```

### Configuration (Preferences)

Open Raycast → Extensions → **R2 Media Uploader** → Preferences:

- **Cloudflare Account ID**
- **R2 Access Key ID**
- **R2 Secret Access Key**
- **Bucket Names (Comma-separated, Optional)**: quick list used by the upload form
- **Custom Domains (Comma-separated, Optional)**: quick list used by the upload form
- **Default Folder Template**: leave empty to upload to the bucket root
- **Default Filename Template**: e.g. `{name}_{time}.{ext}`
- **Bucket Profiles (JSON, Optional)**: advanced per-bucket templates and/or per-bucket `publicBaseUrl`

### Example: simple buckets + domains

- **Bucket Names**:

```text
my-images, my-videos
```

- **Custom Domains**:

```text
https://img.example.com, https://vid.example.com
```

- **Default Folder Template**:

```text
uploads/{yyyy}/{mm}/{dd}
```

- **Default Filename Template**:

```text
{name}_{time}.{ext}
```

### Example: Bucket Profiles (JSON)

```json
[
  {
    "name": "images",
    "bucket": "my-images",
    "keyTemplate": "uploads/{yyyy}/{mm}/{dd}/{name}_{time}.{ext}",
    "publicBaseUrl": "https://img.example.com"
  },
  {
    "name": "videos",
    "bucket": "my-videos",
    "keyTemplate": "videos/{yyyy}/{mm}/{dd}/{uuid}.{ext}",
    "publicBaseUrl": "https://vid.example.com"
  }
]
```

### Key templates

You can use these placeholders in templates:

- `{yyyy}` `{mm}` `{dd}` `{HH}` `{MM}` `{SS}`
- `{time}`: `YYYYMMDDHHMMSS` (e.g. `20260116153045`)
- `{epoch}`: unix milliseconds
- `{uuid}`: random id
- `{filename}` `{name}` `{ext}`

### Usage

- **Upload Selected Files**: select one or more files in Finder → run command → choose bucket + domain → upload → URL(s) copied
- **Upload from Clipboard**:
  - copy an image, or
  - copy a file in Finder (e.g. a video)
  - run command → choose bucket + domain → upload → URL copied
