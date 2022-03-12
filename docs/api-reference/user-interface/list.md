---
description: >-
  The de-facto user interface in Raycast. Ideal to present similar data such as
  to-dos or files.
---

# List

Our `List` component provides great user experience out of the box:

- Use built-in filtering for best performance.
- Group-related items in sections with titles and subtitles.
- Show loading indicator for longer operations.
- Use the search query for typeahead experiences, optionally throttled.

![](../../.gitbook/assets/list.png)

## Search Bar

The search bar allows users to interact quickly with list items. By default, [List.Items](#list.item) are displayed if the user's input can be (fuzzy) matched to the item's `title` or `keywords`.

### Custom filtering

Sometimes, you may not want to rely on Raycast's filtering, but use/implement your own. If that's the case, you can set the `List`'s `enableFiltering` [prop](#props) to false, and the items displayed will be independent of the search bar's text.
Note that `enableFiltering` is also implicitly set to false if an `onSearchTextChange` listener is specified. If you want to specify a change listener and _still_ take advantage of Raycast's built-in filtering, you can explicitly set `enableFiltering` to true.

```typescript
import { useEffect, useState } from "react";
import { Action, ActionPanel, List } from "@raycast/api";

const items = [
  "Augustiner Helles",
  "Camden Hells",
  "Leffe Blonde",
  "Sierra Nevada IPA",
];

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(items);

  useEffect(() => {
    filterList(items.filter((item) => item.includes(searchText)));
  }, [searchText]);

  return (
    <List
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Beers"
      searchBarPlaceholder="Search your favorite beer"
    >
      {filteredList.map((item) => (
        <List.Item
          key={item}
          title={item}
          actions={
            <ActionPanel>
              <Action
                title="Select"
                onAction={() => console.log(`${item} selected`)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

### Programmatically updating the search bar

Other times, you may want the content of the search bar to be updated by the extension, for example, you may store a list of the user's previous searches and, on the next visit, allow them to "continue" where they left off.

To do so, you can use the `searchText` [prop](#props).

```typescript
import { useEffect, useState } from "react";
import { Action, ActionPanel, List } from "@raycast/api";

const items = [
  "Augustiner Helles",
  "Camden Hells",
  "Leffe Blonde",
  "Sierra Nevada IPA",
];

export default function Command() {
  const [searchText, setSearchText] = useState("");

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Beers"
      searchBarPlaceholder="Search your favorite beer"
    >
      {items.map((item) => (
        <List.Item
          key={item}
          title={item}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => setSearchText(item)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

### Dropdown

Some extensions may benefit from giving users a second filtering dimension. A todo extension may allow users to use different groups, a newspaper-reading extension may want to allow quickly switching categories, etc.

This is where the `searchBarAccessory` [prop](#props) is useful. Pass it a [List.Dropdown](#list.dropdown) component, and it will be displayed on the right-side of the search bar. Invoke it either by using the global shortcut `⌘` `P` or by clicking on it.

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
import { List } from "@raycast/api";

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
import { ActionPanel, Action, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Item 1"
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content="👋" />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

{% endtab %}

{% tab title="ListWithDetail.tsx" %}

```jsx
import { ActionPanel, List } from "@raycast/api";
import { usePokemons } from './utils'

export default function Command() {
  const [showingDetail, setShowingDetail] = useState(true);

  const pokemons = usePokemons();

  return (
    <List isLoading={!pokemons} isShowingDetail={showingDetail}>
      {pokemons &&
        pokemons.map((pokemon) => {
          const props: Partial<List.Item.Props> = showingDetail
            ? {
                detail: (
                  <List.Item.Detail
                    markdown={`![Illustration](https://assets.pokemon.com/assets/cms2/img/pokedex/full/${
                      pokemon.id
                    }.png)\n\n${pokemon.types.join(" ")}`}
                  />
                ),
              }
            : { accessoryTitle: pokemon.types.join(" ") };
          return (
            <List.Item
              key={pokemon.id}
              title={pokemon.name}
              subtitle={`#${pokemon.id}`}
              {...props}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={`https://www.pokemon.com/us/pokedex/${pokemon.name}`} />
                  <Action title="Toggle Detail" onAction={() => setShowingDetail(!showingDetail)} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
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
    <List
      navigationTitle="Search Beers"
      searchBarPlaceholder="Search your favorite beer"
    >
      <List.Item title="Augustiner Helles" />
      <List.Item title="Camden Hells" />
      <List.Item title="Leffe Blonde" />
      <List.Item title="Sierra Nevada IPA" />
    </List>
  );
}
```

#### Props

| Prop                 | Type                                                                                                                                                                                              | Required | Default                                                       | Description                                                                                                                                                                                                                                                                          |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------- | :------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| actions              | <code>null</code> or <code>[ActionPanel](./action-panel.md#actionpanel)</code>                                                                                                                    | No       | -                                                             | An [ActionPanel](./action-panel.md#actionpanel) that will be shown when no items are selected (eg. when the List is empty or all items have been filtered out)..                                                                                                                     |
| children             | <code>null</code> or <code>[List.Section](#list.section)</code> or <code>[List.Section](#list.section)[]</code> or <code>[List.Item](#list.item)</code> or <code>[List.Item](#list.item)[]</code> | No       | -                                                             | List sections or items. If [List.Item](#list.item) elements are specified, a default section is automatically created.                                                                                                                                                               |
| enableFiltering      | <code>boolean</code>                                                                                                                                                                              | No       | false when `onSearchTextChange` is specified, true otherwise. | Toggles Raycast filtering. When `true`, Raycast will use the query in the search bar to filter list items. When `false`, the extension needs to take care of the filtering.                                                                                                          |
| isLoading            | <code>boolean</code>                                                                                                                                                                              | No       | false                                                         | Indicates whether a loading bar should be shown or hidden below the search bar                                                                                                                                                                                                       |
| isShowingDetail      | <code>boolean</code>                                                                                                                                                                              | No       | false                                                         | Whether the List should have an area on the right side of the items to show additional details about the selected item. When `true`, it is recommended not to show any accessories on the `List.Item` and instead bring those additional information in the `List.Item.Detail` view. |
| navigationTitle      | <code>string</code>                                                                                                                                                                               | No       | Command title (as defined in the manifest)                    | The main title for that view displayed in Raycast                                                                                                                                                                                                                                    |
| searchBarPlaceholder | <code>string</code>                                                                                                                                                                               | No       | Search value...                                               | Placeholder text that will be shown in the search bar.                                                                                                                                                                                                                               |
| searchBarAccessory   | <code>null</code> or <code>[List.Dropdown](#list.dropdown)</code>                                                                                                                                 | No       | -                                                             | Dropdown shown in the right-hand-side of the search bar.                                                                                                                                                                                                                             |
| searchText           | <code>string</code>                                                                                                                                                                               | No       | -                                                             | The text that will be displayed in the search bar.                                                                                                                                                                                                                                   |
| selectedItemId       | <code>string</code>                                                                                                                                                                               | No       | -                                                             | Selects the item with the specified id.                                                                                                                                                                                                                                              |
| throttle             | <code>boolean</code>                                                                                                                                                                              | No       | false                                                         | Defines whether the [List.Props.onSearchTextChange](#listprops) will be triggered on every keyboard press or with a delay for throttling the events. Recommended to set to `true` when using custom filtering logic with asynchronous operations (e.g. network requests).            |
| onSearchTextChange   | <code>(text: string) => void</code>                                                                                                                                                               | No       | -                                                             | Callback triggered when the search bar text changes. Note: Specifying this implicitly toggles `enableFiltering` to false. To enable native filtering when using `onSearchTextChange`, explicitly set `enableFiltering` to true.                                                      |
| onSelectionChange    | <code>(id: string) => void</code>                                                                                                                                                                 | No       | -                                                             |                                                                                                                                                                                                                                                                                      |

### List.Dropdown

A dropdown menu that will be shown in the right-hand-side of the search bar.

#### Example

```typescript
import { List } from "@raycast/api";

function DrinkDropdown(props: DrinkDropdownProps) {
  const { isLoading = false, drinkTypes, onDrinkTypeChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Drink Type"
      storeValue={true}
      onChange={(newValue) => {
        onDrinkTypeChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Alcoholic Beverages">
        {drinkTypes.map((drinkType) => (
          <List.Dropdown.Item
            key={drinkType.id}
            title={drinkType.name}
            value={drinkType.id}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const drinkTypes = [
    { id: 1, name: "Beer" },
    { id: 2, name: "Wine" },
  ];
  const onDrinkTypeChange = (newValue) => {
    console.log(newValue);
  };
  return (
    <List
      navigationTitle="Search Beers"
      searchBarPlaceholder="Search your favorite drink"
      searchBarAccessory={
        <DrinkDropdown
          drinkTypes={drinkTypes}
          onDrinkTypeChange={onDrinkTypeChange}
        />
      }
    >
      <List.Item title="Augustiner Helles" />
      <List.Item title="Camden Hells" />
      <List.Item title="Leffe Blonde" />
      <List.Item title="Sierra Nevada IPA" />
    </List>
  );
}
```

#### Props

| Prop         | Type                                                                                                                                                                                                                     | Required | Default | Description                                                                                                                                                                                                           |
| :----------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------- | :------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id           | <code>string</code>                                                                                                                                                                                                      | No       | -       | ID of the dropdown. Should be used in conjunction with `storeValue`. If not specified, a default value is used.                                                                                                       |
| tooltip      | <code>string</code>                                                                                                                                                                                                      | Yes      | -       | Tooltip displayed when hovering the dropdown.                                                                                                                                                                         |
| placeholder  | <code>string</code>                                                                                                                                                                                                      | Yes      | -       | Placeholder text that will be shown in the dropdown search field.                                                                                                                                                     |
| storeValue   | <code>boolean</code>                                                                                                                                                                                                     | No       | false   | Indicates whether the value of the dropdown should be persisted after selection, and restored next time the dropdown is rendered.                                                                                     |
| value        | <code>string</code>                                                                                                                                                                                                      | No       | -       | The current value of the dropdown.                                                                                                                                                                                    |
| defaultValue | <code>string</code>                                                                                                                                                                                                      | No       | -       | The default value of the dropdown. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. |
| children     | <code>null</code> or <code>[List.Dropdown.Section](#list.dropdown.section)</code> or <code>List.Dropdown.Section[]</code> or <code>[List.Dropdown.Item](#list.dropdown.item)</code> or <code>List.Dropdown.Item[]</code> | No       | -       | Sections or items. If [List.Dropdown.Item](#list.dropdown.item) elements are specified, a default section is automatically created.                                                                                   |
| onChange     | <code>(newValue: string) => void</code>                                                                                                                                                                                  | No       | -       | Callback triggered when the list item selection changes.                                                                                                                                                              |

### List.Dropdown.Item

A dropdown item in a [List.Dropdown](#list.dropdown)

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
    return (
      <List searchBarAccessory={
        <List.Dropdown tooltip="Dropdown With Items">
          <List.Dropdown.Item title="One" value="one" />
          <List.Dropdown.Item title="Two" value="two" />
          <List.Dropdown.Item title="Three" value="three" />
        </List.Dropdown>
      }>
        <List.Item title="Item in the Main List">
      </List>
  );
}
```

#### Props

| Prop  | Type                                                      | Required | Default | Description                                                                                                                   |
| :---- | :-------------------------------------------------------- | :------- | :------ | :---------------------------------------------------------------------------------------------------------------------------- |
| icon  | <code>[ImageLike](./icons-and-images.md#imagelike)</code> | No       | -       | A optional icon displayed for the item. See [ImageLike](./icons-and-images.md#imagelike) for the supported formats and types. |
| title | <code>string</code>                                       | Yes      | -       | The title displayed for the item.                                                                                             |
| value | <code>string</code>                                       | Yes      | -       | Value of the dropdown item. Make sure to assign each unique value for each item.                                              |

### List.Dropdown.Section

Visually separated group of dropdown items.

Use sections to group related menu items together.

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List searchBarAccessory={
      <List.Dropdown tooltip="Dropdown With Sections">
        <List.Dropdown.Section title="First Section">
          <List.Dropdown.Item title="One" value="one" />
        </List.Dropdown.Section>
        <List.Dropdown.Section title="Second Section">
          <List.Dropdown.Item title="Two" value="two" />
        </List.Dropdown.Section>
      </List.Dropdown>
    }>
      <List.Item title="Item in the Main List">
    </List>
  );
}
```

#### Props

| Prop     | Type                                                                                                                                    | Required | Default | Description                       |
| :------- | :-------------------------------------------------------------------------------------------------------------------------------------- | :------- | :------ | :-------------------------------- |
| children | <code>null</code> or <code>[List.Dropdown.Item](#list.dropdown.item)</code> or <code>[List.Dropdown.Item](#list.dropdown.item)[]</code> | No       | -       | The item elements of the section. |
| title    | <code>string</code>                                                                                                                     | No       | -       | Title displayed above the section |

### List.Item

A item in the [List](#list).

This is one of the foundational UI components of Raycast. A list item represents a single entity. It can be a
GitHub pull request, a file, or anything else. You most likely want to perform actions on this item, so make it clear
to the user what this list item is about.

#### Example

```typescript
import { Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        icon={Icon.Star}
        title="Augustiner Helles"
        subtitle="0,5 Liter"
        accessoryTitle="Germany"
      />
    </List>
  );
}
```

#### Props

| Prop           | Type                                                                           | Required | Default | Description                                                                                                                                                                                         |
| :------------- | :----------------------------------------------------------------------------- | :------- | :------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| title          | <code>string</code>                                                            | Yes      | -       | The main title displayed for that item.                                                                                                                                                             |
| actions        | <code>null</code> or <code>[ActionPanel](./action-panel.md#actionpanel)</code> | No       | -       | An [ActionPanel](./action-panel.md#actionpanel) that will be shown when the item is selected.                                                                                                       |
| icon           | <code>[ImageLike](./icons-and-images.md#imagelike)</code>                      | No       | -       | A optional icon displayed for the list item.                                                                                                                                                        |
| id             | <code>string</code>                                                            | No       | -       | ID of the item. Make sure to assign each item a unique ID or a UUID will be auto generated.                                                                                                         |
| keywords       | <code>string[]</code>                                                          | No       | -       | An optional property used for providing additional indexable strings for search. When filtering the list in Raycast through the search bar, the keywords will be searched in addition to the title. |
| subtitle       | <code>string</code>                                                            | No       | -       | An optional subtitle displayed next to the main title.                                                                                                                                              |
| accessoryIcon  | <code>[ImageLike](./icons-and-images.md#imagelike)</code>                      | No       | -       | A optional icon displayed as accessory for the list item.                                                                                                                                           |
| accessoryTitle | <code>string</code>                                                            | No       | -       | An additional title displayed for the item.                                                                                                                                                         |
| detail         | <code>null</code> or <code>[List.Item.Detail](#list.item.detail)</code>        | No       | -       | The `List.Item.Detail` to be rendered in the right side area when the parent `List` is showing detail and the item is selected.                                                                     |

### List.Item.Detail

A Detail view that will be shown in the right-hand-side of the `List`.

When shown, it is recommended not to show any accessories on the `List.Item` and instead bring those additional information in the `List.Item.Detail` view.

![List-detail illustration](../../.gitbook/assets/list-detail.png)

#### Example

```typescript
import { Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List isShowingDetail>
      <List.Item
        title="Pikachu"
        subtitle="Electric"
        detail={
          <List.Item.Detail markdown="![Illustration](https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png)" />
        }
      />
    </List>
  );
}
```

#### Props

| Prop      | Type                 | Required    | Default            | Description                                                                |
| :-------- | :------------------- | :---------- | :----------------- | :------------------------------------------------------------------------- | 
| markdown  | <code>string         | null</code> | No                 | The CommonMark string to be rendered in the right side area when the parent List is showing details and the item is selected. |
| isLoading | <code>boolean</code> | No          | <code>false</code> | Indicates whether a loading bar should be shown or hidden above the detail |

### List.Section

A group of related [List.Item](#list.item).

Sections are a great way to structure your list. For example, group GitHub issues with the same status and order them by priority.
This way, the user can quickly access what is most relevant.

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

| Prop     | Type                                                                                                | Required | Default | Description                                                                                       |
| :------- | :-------------------------------------------------------------------------------------------------- | :------- | :------ | :------------------------------------------------------------------------------------------------ |
| children | <code>null</code> or <code>[List.Item](#list.item)</code> or <code>[List.Item](#list.item)[]</code> | No       | -       | The [List.Item](#list.item) elements of the section.                                              |
| id       | <code>string</code>                                                                                 | No       | -       | ID of the section. Make sure to assign each section a unique ID or a UUID will be auto generated. |
| subtitle | <code>string</code>                                                                                 | No       | -       | An optional subtitle displayed next to the title of the section.                                  |
| title    | <code>string</code>                                                                                 | No       | -       | Title displayed above the section.                                                                |
