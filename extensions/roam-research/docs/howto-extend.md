# How to Extend

Recipes for common development tasks in this extension.

---

## Adding a New Raycast Command

1. Create `src/my-command.tsx` with a default export function (React component for `view` mode, async function for `no-view` mode)
2. Add an entry to the `commands[]` array in `package.json`:
   ```json
   {
     "name": "my-command",
     "title": "My Command",
     "description": "What it does",
     "mode": "view"
   }
   ```
3. For **`no-view` mode** (like `instant-capture-default-graph.tsx`): You cannot use React hooks. Read config directly via `LocalStorage.getItem("graphs-config")` and parse it yourself. Use `resolveInstantCapture()` from `utils.ts` for capture commands.
4. For **multi-graph commands**: Filter graphs by capability:
   ```typescript
   const appendableGraphs = keys(graphsConfig).filter(
     (name) => graphsConfig[name].capabilities?.append !== false
   );
   ```
5. **Auto-select pattern**: If only 1 matching graph, skip the picker and go straight to the main view (see `quick-capture.tsx` for the pattern).
6. Update `CLAUDE.md` entry points section.

---

## Adding a New GraphConfig Field

1. Add an optional field to `GraphConfig` in `globals.d.ts`:
   ```typescript
   type GraphConfig = {
     // ... existing fields
     myNewField?: string;
   };
   ```
2. **Always use optional (`?`)** — existing saved configs won't have the field. Handle `undefined` as the backward-compatible default.
3. If it needs a UI for editing: add a form field to `new-graph.tsx` or create a dedicated settings view.
4. If it's computed (like `capabilities`): add detection logic and persist via `saveGraphConfig()`.

---

## Adding a New Template Variable

1. Add the replacement logic in `roamApi.ts → processCapture()`, following the existing pattern:
   ```typescript
   processed = processed.replaceAll(/\{myvar}/gi, computedValue);
   ```
   Place it alongside the existing `{time}`, `{today}`, `{date}`, `{content}`, `{tags}` replacements. Note: variables are replaced before `{content}` to prevent user input from being expanded as a variable.
2. Update the help text in `components.tsx → CONTENT_TEMPLATE_HELP` so users see the new variable in the template form.
3. Update the variable substitution table in `docs/capture-templates.md`.

---

## Adding a New Roam Query

Use the SDK functions from `roam-api-sdk-copy.ts` via the wrapper in `roamApi.ts`:

| Function | Use For |
|----------|---------|
| `roamApiSdk.q(client, datalogQuery, args?)` | Datalog queries (finding blocks, pages by criteria) |
| `roamApiSdk.pull(client, pattern, eid)` | Single entity pull by UID |
| `roamApiSdk.search(client, searchStr, hideCodeBlocks?, limit?)` | Full-text search (limit defaults to 100) |

Initialize the client:
```typescript
const client = initRoamBackendClient(graphConfig.nameField, graphConfig.tokenField);
```

For rich block data, use the `BLOCK_QUERY` pull pattern from `roamApi.ts`. See `docs/roam-api-reference.md` for the full query catalog and rate limits.

---

## See Also

- `docs/roam-api-reference.md` — API endpoints, query catalog, rate limits
- `docs/capture-templates.md` — Template system details
- `docs/gotchas.md` — Edge cases to watch for
