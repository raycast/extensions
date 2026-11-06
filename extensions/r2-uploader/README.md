# Cloudflare R2 File Uploader

Upload files from Finder, copy public links, and browse your Cloudflare R2 bucket in Raycast.

## Set up

1. [Create R2 access keys](https://developers.cloudflare.com/r2/api/tokens/) with **Object Read & Write** access scoped to your bucket.
2. In the extension preferences, enter your bucket name, Cloudflare account ID, access key ID, and secret access key.
3. To upload and copy links, set **Public Base URL** to your bucket's [public custom domain or `r2.dev` URL](https://developers.cloudflare.com/r2/buckets/public-buckets/), such as `https://cdn.example.com` or `https://pub-xxx.r2.dev`. You can still browse and preview images in a private bucket without this setting.

## Use it

- **Upload File to R2** uploads the files selected in Finder and copies one link per line. Choose URL, Markdown, or HTML in **Link Format**.
- **Browse R2 Files** opens your bucket. Navigate folders, preview images, copy links, or delete files and folders.

## Customize uploads

- **Folder:** Set a default **Upload Path Prefix**, such as `uploads/{year}/{month}`. The command's **Folder** argument overrides it and stays active for later uploads. Enter `/` or `root` to clear the override.
- **Filename:** Leave **File Name Format** blank to add a unique timestamped suffix. A custom format like `{name}_{year}{month}{day}.{ext}` can overwrite a file with the same resulting key. Both the filename format and upload prefix accept `{name}`, `{ext}`, `{year}`, `{month}`, `{day}`, `{hours}`, `{minutes}`, and `{seconds}`.
- **Image conversion:** Run `brew install libavif` for AVIF or `brew install webp` for WebP, then turn on the matching conversion preference. Enable one format at a time. Quality ranges from 0 to 100 and defaults to 80. If conversion fails or the encoder is missing, the extension uploads the original and tells you in the upload toast.

Report bugs in [raycast/extensions](https://github.com/raycast/extensions/issues).