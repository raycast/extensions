# Scripts

## update-schema.ts

Updates the osquery schema to the latest version.

### Usage

```bash
npm run update-schema
```

### What it does

1. Fetches the latest osquery release version from GitHub API
2. Compares with current version in `src/schema/version.json`
3. If newer version exists:
   - Downloads schema from `osquery/osquery-site` repo
   - Saves as `src/schema/schema-{version}.json`
   - Updates import in `src/schema/loader.ts`
   - Updates `src/schema/version.json`
   - Deletes old schema file

### Schema Source

```
https://raw.githubusercontent.com/osquery/osquery-site/main/src/data/osquery_schema_versions/{version}.json
```

### Automation

The GitHub Actions workflow (`.github/workflows/update-schema.yml`) can be triggered manually from the Actions tab. It creates a PR if updates are available.

### Exit Codes

- `0` - Update successful
- `1` - Already up to date
- `2` - Error occurred
