# meta

Generate HTML meta tags.

## Raycast Command

- Name: Meta Tag Generator.
- Purpose: generate copyable HTML meta tags for page, Open Graph, and Twitter/X previews.
- UI: Form with live output once title and description are present.
- Dependency: requires the local `delphitools` CLI; shows the existing install guidance view when missing.

## Inputs

No positional input.

## Options

- `--title <TITLE>` required: page title.
- `--description <DESCRIPTION>` required: page description.
- `--url <URL>`: canonical URL.
- `--image <IMAGE>`: preview image URL.
- `--page-type <PAGE_TYPE>`: Open Graph page type; default `website`.
- `--site-name <SITE_NAME>`: site name.
- `--author <AUTHOR>`: author name.
- `--twitter-handle <TWITTER_HANDLE>`: Twitter/X handle.
- Global: `--json`, `--quiet`, `--output`.

## Output

HTML meta tags.

## Raycast Parameters

Required fields:

- Title: page title. The command shows `current/60` character guidance but does not block longer values.
- Description: page description. The command shows `current/160` character guidance but does not block longer values.

Optional fields:

- Canonical URL.
- Preview Image URL.
- Page Type: `website`, `article`, `profile`, `book`, `music`, or `video`; defaults to `website`.
- Site Name.
- Author.
- Twitter/X Handle.

## Raycast Actions

- Copy Meta Tags: default Action; copies generated HTML tags.
- Show Preview: opens a Detail view with title, image, description, site/URL, author, Twitter/X handle, and generated tag source.

## CLI Mapping

The command runs `delphitools meta --quiet` with:

- Title -> `--title`.
- Description -> `--description`.
- Canonical URL -> `--url` when filled.
- Preview Image URL -> `--image` when filled.
- Page Type -> `--page-type`; always sent, defaulting to `website`.
- Site Name -> `--site-name` when filled.
- Author -> `--author` when filled.
- Twitter/X Handle -> `--twitter-handle` when filled.

## Validation

Title and description are required before output is generated. Character counts are guidance only; longer values are passed through to the CLI.
