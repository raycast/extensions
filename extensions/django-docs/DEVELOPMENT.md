# Raycast Extension Development Reference

## Entry Point Structure

```typescript
// View command (with UI)
import { List } from "@raycast/api";
export default function Command() {
  return <List>...</List>;
}

// No-view command (background task)
export default async function Command() {
  await doSomething();
}
```

## Command Modes
- `"view"` = has UI (List/Grid/Detail/Form)
- `"no-view"` = background task, no UI
- `"menu-bar"` = menu bar extra

Command name in `package.json` must match filename: `"name": "search-documentation"` → `src/commands/search-documentation.tsx`

## Utilities from @raycast/utils
- `useCachedPromise()` → async data with caching
- `useFetch()` → fetch with loading states
- `useForm()` → form validation
- `useCachedState()` → persist state between sessions

## Storage
```typescript
await LocalStorage.setItem("key", "value");
const item = await LocalStorage.getItem<string>("key");
```
Use for small data only. For large files, use Node's `fs`.

## Store Submission
⚠️ - Run `npm run build` _and_ `npm run fix-lint` successfully before PR ⚠️
- README must have setup instructions
- PRs reviewed within 1 week, marked stale after 14 days inactive

## Resources
- API Reference: https://developers.raycast.com/api-reference
- Examples: https://developers.raycast.com/examples
- Guidelines: https://manual.raycast.com/extensions
- Store Guidelines: https://developers.raycast.com/basics/prepare-an-extension-for-store
