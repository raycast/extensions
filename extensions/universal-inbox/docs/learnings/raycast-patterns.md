# Raycast API Patterns

## useFetch — data loading

```ts
const { isLoading, data, mutate } = useFetch<Page<Notification>>(url, {
  headers: { Authorization: `Bearer ${preferences.apiKey}` },
});
```

- `data` is undefined until loaded — guard with `data?.content`
- `mutate` is the cache invalidation function; pass it down to child components
- `isLoading` passed to `<List isLoading={isLoading}>` shows spinner

## List Component

```tsx
<List
  isLoading={isLoading}
  searchBarPlaceholder="Filter..."
  searchBarAccessory={<Dropdown />}   // optional filter
>
  <List.EmptyView icon={...} title="..." description="..." />  // zero-state
  {data?.content.map((item) => <ListItem key={item.id} ... />)}
</List>
```

## List.Item with ActionPanel

```tsx
<List.Item
  title={notification.title}
  subtitle="secondary text"
  accessories={[{ icon: Icon.Star }, { text: "label" }]}
  actions={
    <ActionPanel>
      <Action.OpenInBrowser url={url} />
      <Action title="..." icon={Icon.Trash} onAction={handler} />
      <Action.Push title="Details" target={<DetailComponent />} />
    </ActionPanel>
  }
/>
```

## Action shortcuts

Raycast shortcut format: `{ modifiers: ["ctrl"], key: "d" }`.

Common shortcuts used in this project:
- `ctrl+d` — delete
- `ctrl+u` — unsubscribe
- `ctrl+s` — snooze
- `ctrl+t` — create task
- `ctrl+l` — link to task

## Detail component

```tsx
<Detail
  markdown="# Markdown content"
  actions={<ActionPanel>...</ActionPanel>}
/>
```

Used for preview panels pushed via `Action.Push`.

## Dropdown (searchBarAccessory)

```tsx
<List.Dropdown tooltip="Select type" value={value} onChange={onChange}>
  <List.Dropdown.Section title="Section">
    <List.Dropdown.Item key="val" title="Label" value="val" />
  </List.Dropdown.Section>
</List.Dropdown>
```

## getPreferenceValues

```ts
import { getPreferenceValues } from "@raycast/api";
const preferences = getPreferenceValues<UniversalInboxPreferences>();
```

Always call inside the component or action — not at module level.

## ts-pattern usage

```ts
import { match } from "ts-pattern";

match(response)
  .with({ status: 400 }, async (r) => { throw new Error(...) })
  .with({ status: 401 }, async (r) => { throw new Error(...) })
  .otherwise((r) => r);
```

Used in `handleErrors()` in `src/api.ts`.
