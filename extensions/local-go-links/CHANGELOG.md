# Local Go Links Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Open Local Go Link command: resolve an alias from a local JSON file and
  open the URL in the default browser.
- Positional `{0}`, `{1}`, ... placeholders filled from URL-encoded
  arguments typed after the alias.
- Configurable JSON file location (defaults to `~/go-links.json`), re-read
  on every invocation — no caching, no network.
