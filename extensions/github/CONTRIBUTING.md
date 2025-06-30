## Contributing

1. Get a GitHub token to be able to generate the GraphQL types from [GraphQL Code Generator](https://www.the-guild.dev/graphql/codegen).
2. Run `cp .env.example .env`
3. Assign your created token to `GITHUB_TOKEN`
4. Run `npm run dev`. This will spawn two processes: one launching the Raycast command in development and the other watching for your GraphQL changes.
