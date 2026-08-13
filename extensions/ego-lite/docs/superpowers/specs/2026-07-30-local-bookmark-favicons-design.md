# Local Bookmark Favicons Design

## Goal

Show real website favicons in the Ego Lite Raycast extension's Search Bookmarks command while keeping bookmark URLs and icon lookups entirely on the Mac.

## Scope

- Change only Search Bookmarks.
- Read favicon images from the active Ego Lite Chromium profile's `Favicons` SQLite database.
- Keep the existing locally generated domain avatar when no usable favicon is available.
- Do not change Search History, New Tab, bookmark parsing, or AI Task Space behavior.
- Do not contact favicon services or any other network endpoint.

## Data Source

Resolve the active profile with the existing profile resolver and open its `Favicons` database read-only. Chromium stores page-to-icon relationships in `icon_mapping` and encoded image data in `favicon_bitmaps`.

Open the database through Node's built-in SQLite API with a read-only `file:` URI and `immutable=1`. This avoids Chromium's active database lock without copying the file or requesting write access. Query both tables once when Search Bookmarks opens. Return the mapped page URL, PNG bytes encoded as hexadecimal text, width, height, and update timestamp. Rank duplicate bitmaps by:

1. Non-empty image data.
2. The largest available dimensions, preferring the existing 32 by 32 image over 16 by 16.
3. The most recently updated record when dimensions are equal.

The query is bounded to the favicon records already present in Ego Lite. It does not write, repair, copy, or migrate the database.

## Components

### Favicon repository

Add `src/lib/favicons.ts` with focused pure helpers and query construction:

- A row model for the SQLite result.
- A query that joins `icon_mapping` to `favicon_bitmaps`.
- Conversion from PNG hexadecimal text to a `data:image/png;base64,...` Raycast image source.
- Index construction for exact URL and origin-based fallback matching.
- A lookup function that returns an image source or `undefined`.

The helpers reject malformed URLs, empty images, and non-PNG data without throwing into the command UI.

### Search Bookmarks command

Resolve the active `Favicons` path alongside bookmark loading. Use the command's existing promise-based loading pattern to call the read-only SQLite repository. Favicon loading remains optional: bookmark results render immediately when possible and remain usable if the database is absent, inaccessible, or malformed.

Pass the matched favicon source to each bookmark result.

### Shared browser item

Add an optional icon property to `BrowserItem`. When supplied, use the local favicon. Otherwise preserve the current locally generated domain avatar and link-icon fallback.

Search History does not pass this property and therefore retains its current presentation.

## Matching Rules

For each HTTP or HTTPS bookmark URL:

1. Normalize and try an exact page-URL match.
2. If no exact match exists, try the normalized origin, including scheme, hostname, and non-default port.
3. If several mappings exist for the same origin, use the highest-ranked bitmap.
4. If no match is found, use the existing domain avatar.

Keeping the scheme and port in the origin key prevents unrelated services on the same hostname from being merged.

## Error Handling

- A missing `Favicons` database produces no favicon rows and no error view.
- A SQLite permission, locking, or schema error is contained within favicon loading; Search Bookmarks continues with fallback icons.
- Malformed URLs and invalid image rows are ignored individually.
- Bookmark-loading errors keep their existing behavior and are not masked by favicon handling.

No additional required permission is introduced. If Raycast cannot read the local favicon database, the feature degrades silently instead of blocking bookmark search or requiring Full Disk Access solely for icons.

## Privacy

- No bookmark URL, hostname, search text, or image data leaves the Mac.
- No remote favicon provider is used.
- The Ego Lite favicon database is accessed read-only.
- The extension creates no persistent favicon cache of its own.

## Testing

Add unit tests for:

- Selecting the largest and newest valid bitmap.
- Exact URL matching before origin fallback.
- Scheme and port isolation in origin matching.
- PNG hexadecimal conversion to a data URI.
- Invalid URL, empty image, and malformed image fallback.

Run the full test suite, Raycast lint, and Raycast build. In local Raycast acceptance testing, verify that a bookmark with a cached Ego Lite favicon displays its real icon and that a bookmark without one still displays the existing domain avatar.

## Acceptance Criteria

- Search Bookmarks displays locally cached real favicons where available.
- Missing or unreadable favicon data never prevents bookmarks from appearing or opening.
- No network favicon request occurs.
- Search History and New Tab behavior remain unchanged.
- Automated tests, lint, build, and local UI verification pass.
