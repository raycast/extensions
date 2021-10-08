# Detail

## API Reference

### Detail

Renders a markdown (CommonMark) string.

Typically used when navigating from a list or as standalone view.

#### Example

```typescript
import { Detail } from "@raycast/api";

export default function Command() {
  return <Detail markdown="**Hello** _World_!" />;
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| actions | `null` or `ActionPanel` | No | - | A reference to an [ActionPanel](../user-interface/action-panel.md#actionpanel). |
| children | `null` or `ReactElement<unknown, string>` | No | - |  |
| isLoading | `boolean` | No | false | Indicates whether a loading bar should be shown or hidden below the search bar |
| markdown | `null` or `string` | No | - | The CommonMark string to be rendered. |
| navigationTitle | `string` | No | Command title | The main title for that view displayed in Raycast |
