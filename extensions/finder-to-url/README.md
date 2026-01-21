# Finder to URL

A Raycast extension that converts selected Finder items to URLs and copies them to your clipboard. This extension is especially useful if you have a finder folder that is in sync with a CDN folder like Cloudflare R2, Amazon S3 or any other service.

## Usage

1. Select one or more files/folders in Finder
2. Open Raycast and run "Copy as URL"
3. The URL(s) will be copied to your clipboard

If multiple items are selected, each URL will be on a separate line.

## Configuration

Open extension preferences (`Cmd+Shift+,`) to configure:

- **Starts With**: The path segment to match and cut from (e.g., `/cdn`). Leave empty to copy the full path.
- **URL Prefix**: The prefix to add before the matched path (e.g., `https://my.cdn.com`). Leave empty to copy the full path.

### Example

With a file at:

```
/Users/you/Documents/cdn/images/photo.png
```

And settings:

- **Starts With**: `/cdn`
- **URL Prefix**: `https://my.cdn.com`

The result will be:

```
https://my.cdn.com/cdn/images/photo.png
```

Spaces and special characters are automatically URL-encoded.
