# Tenant Lookup Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Bidirectional tenant lookup: search by name or UUID, copy/paste the counterpart.
- Data source is configurable: a local JSON file, a private S3 object, or local-first with S3 fallback.
- S3 reads use the user's own AWS SSO session — no credentials are bundled in the extension.
