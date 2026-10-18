# JSON Schema Store

Search the [SchemaStore](https://www.schemastore.org) catalog for JSON schemas, right from Raycast.

## Usage

Open **Search Schema Store** and start typing. The list filters by schema name, description, and `fileMatch` patterns, so searching for `tsconfig.json` or `.eslintrc` finds the matching schema.

Each result offers three actions:

- **Copy Schema URL** (default): copy the schema's URL to the clipboard
- **Open in Browser**: open the schema in your browser
- **Paste**: paste the schema URL into the frontmost app

The catalog is fetched from <https://www.schemastore.org/api/json/catalog.json> and cached between launches.
