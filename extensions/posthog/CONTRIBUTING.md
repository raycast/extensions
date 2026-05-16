# Contributing

## Resyncing AI tool definitions from PostHog/mcp

The `tools` array in `package.json` and `src/tools/_definitions.json` are derived from the schema at
[`PostHog/mcp/schema/tool-definitions.json`](https://github.com/PostHog/mcp/blob/main/schema/tool-definitions.json).

When upstream adds, removes, or renames tools, refresh the vendored copy:

```bash
gh api 'repos/PostHog/mcp/contents/schema/tool-definitions.json' --jq '.content' \
  | base64 -d > src/tools/_definitions.json
```

Then regenerate the `tools` array in `package.json`:

```bash
python3 scripts/sync-tools.py
```

If a new tool was added, also create the corresponding `src/tools/<tool-name>.ts` handler. Use an existing
handler in the same feature directory as a template — the convention is:

- `type Input = { ... }` with rich JSDoc on every field (this is what Raycast AI reads)
- Default export an `async (input: Input) =>` function
- For mutating tools, export `confirmation: Tool.Confirmation<Input>` that returns `{ message, info }`

If a tool was removed upstream, delete the matching handler. The `npm run build` step
will fail if the vendored schema references a tool with no handler.
