## Contributing

1. Run `npm ci` to install the extension's dependencies.
2. Run `npm run dev`. This will spawn two processes: one launching the Raycast command in development and the other watching for your GraphQL changes.

GraphQL types are generated from the checked-in GitHub schema, so generation does not require a GitHub token or network access. Run `npm run update-schema` to download the latest [public schema from GitHub Docs](https://github.com/github/docs/blob/main/src/graphql/data/fpt/schema.docs.graphql); this refresh requires network access but no authentication. Then regenerate the types with `npm run generate`.
