---
description: >-
  The de-facto user interface in Raycast. Ideal to present similar data such as
  to-dos or files.
---

# List

## Features

Our `List` component provides great user experience out of the box:

* Use built-in filtering for best performance.
* Group related items in sections with titles and subtitles.
* Show loading indicator for longer operations.
* Use the search query for typeahead experiences.

## Examples

{% tabs %}
{% tab title="List.tsx" %}
```jsx
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="Item 1" />
      <List.Item title="Item 2" subtitle="Optional subtitle" />
    </List>
  );
}
```
{% endtab %}

{% tab title="ListWithSections.tsx" %}
```jsx
import { List } from "@raycast/api"

export default function Command() {
  return (
    <List>
      <List.Section title="Section 1">
        <List.Item title="Item 1" />
      </List.Section>
      <List.Section title="Section 2" subtitle="Optional subtitle">
        <List.Item title="Item 1" />
      </List.Section>
    </List>
  );
}
```
{% endtab %}

{% tab title="ListWithActions.tsx" %}
```jsx
import { ActionPanel, CopyToClipboardAction, List } from "@raycast/api"

export default function Command() {
  return (
    <List>
      <List.Item
        title="Item 1"
        actions={
          <ActionPanel>
            <CopyToClipboardAction content="👋" />
          </ActionPanel>
        }
      />
    </List>
  );
}
```
{% endtab %}
{% endtabs %}

## API Reference

### List

Displays [List.Section](#list.section) or [List.Item](#list.item).

The list uses built-in filtering by indexing the title of list items and additionally keywords.

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List navigationTitle="Search Beers" searchBarPlaceholder="Search your favorite beer">
      <List.Item title="Augustiner Helles" />
      <List.Item title="Camden Hells" />
      <List.Item title="Leffe Blonde" />
      <List.Item title="Sierra Nevada IPA" />
    </List>
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| actions | <code>null</code> or <code>[ActionPanel](./action-panel.md#actionpanel)</code> | No | - | A reference to an [ActionPanel](./action-panel.md#actionpanel). |
| children | <code>null</code> or <code>[List.Section](#list.section)</code> or <code>List.Section[]</code> or <code>[List.Item](#list.item)</code> or <code>List.Item[]</code> | No | - | List sections or items. If [List.Item](#list.item) elements are specified, a default section is automatically created. |
| isLoading | <code>boolean</code> | No | false | Indicates whether a loading bar should be shown or hidden below the search bar |
| navigationTitle | <code>string</code> | No | Command title | The main title for that view displayed in Raycast |
| searchBarPlaceholder | <code>string</code> | No | Search value... | Placeholder text that will be shown in the search bar. |
| selectedItemId | <code>string</code> | No | - | Selects the item with the specified id. |
| throttle | <code>boolean</code> | No | false | Defines whether the [ListProps.onSearchTextChange](#listprops) will be triggered on every keyboard press or with a delay for throttling the events. Recommended to set to `true` when using custom filtering logic with asynchronous operations (e.g. network requests). |
| onSearchTextChange | <code>(text: string) => void</code> | No | - |  |
| onSelectionChange | <code>(id: string) => void</code> | No | - |  |

### List.Item

A item in the [List](#list).

This is one of the foundational UI components of Raycast. A list item represents a single entity. It can be a
GitHub pull request, a file or anything else. Most likely you want to perform actions on this item, so make it clear
to the user what this list item is about.

#### Example

```typescript
import { Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item icon={Icon.Star} title="Augustiner Helles" subtitle="0,5 Liter" accessoryTitle="Germany" />
    </List>
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| accessoryIcon | <code>[ImageLike](./icons-and-images.md#imagelike)</code> | No | - | A optional icon displayed as accessory for the list item. See [ImageLike](./icons-and-images.md#imagelike) for the supported formats and types. |
| accessoryTitle | <code>string</code> | No | - | An additional title displayed for the item. |
| actions | <code>null</code> or <code>[ActionPanel](./action-panel.md#actionpanel)</code> | No | - | An [ActionPanel](./action-panel.md#actionpanel) that will be updated for the selected list item. |
| icon | <code>[ImageLike](./icons-and-images.md#imagelike)</code> | No | - | A optional icon displayed for the list item. See [ImageLike](./icons-and-images.md#imagelike) for the supported formats and types. |
| id | <code>string</code> | No | - | ID of the item. Make sure to assign each item a unique ID or a UUID will be auto generated. |
| keywords | <code>string[]</code> | No | - | An optional property used for providing additional indexable strings for search. When filtering the list in Raycast through the search bar, the keywords will be searched in addition to the title. |
| subtitle | <code>string</code> | No | - | An optional subtitle displayed next to the main title. |
| title | <code>string</code> | Yes | - | The main title displayed for that item. |

### List.Section

A group of related [List.Item](#list.item).

Sections are a great way to structure your list. F.e. group GitHub issues with the same status and order them by priority.
This way the user can quickly access what is most relevant.

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Section title="Lager">
        <List.Item title="Camden Hells" />
      </List.Section>
      <List.Section title="IPA">
        <List.Item title="Sierra Nevada IPA" />
      </List.Section>
    </List>
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | <code>null</code> or <code>[List.Item](#list.item)</code> or <code>List.Item[]</code> | No | - | The [List.Item](#list.item) elements of the section. |
| id | <code>string</code> | No | - | ID of the section. Make sure to assign each section a unique ID or a UUID will be auto generated. |
| subtitle | <code>string</code> | No | - | An optional subtitle displayed next to the title of the section. |
| title | <code>string</code> | No | - | Title displayed above the section. |
