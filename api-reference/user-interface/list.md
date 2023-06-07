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

Sometimes, you may not want to rely on Raycast's filtering, but use/implement your own. If that's the case, you can set the `List`'s `filtering` [prop](#props) to false, and the items displayed will be independent of the search bar's text.
Note that `filtering` is also implicitly set to false if an `onSearchTextChange` listener is specified. If you want to specify a change listener and _still_ take advantage of Raycast's built-in filtering, you can explicitly set `filtering` to true.

```typescript
import { useEffect, useState } from "react";
import { Action, ActionPanel, List } from "@raycast/api";

const items = ["Augustiner Helles", "Camden Hells", "Leffe Blonde", "Sierra Nevada IPA"];

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(items);

  useEffect(() => {
    filterList(items.filter((item) => item.includes(searchText)));
  }, [searchText]);

  return (
    <List
      filtering={false}
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
              <Action title="Select" onAction={() => console.log(`${item} selected`)} />
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

const items = ["Augustiner Helles", "Camden Hells", "Leffe Blonde", "Sierra Nevada IPA"];

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
import { useState } from "react";
import { Action, ActionPanel, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

interface Pokemon {
  name: string;
  height: number;
  weight: number;
  id: string;
  types: string[];
  abilities: Array<{ name: string; isMainSeries: boolean }>;
}

const pokemons: Pokemon[] = [
  {
    name: "bulbasaur",
    height: 7,
    weight: 69,
    id: "001",
    types: ["Grass", "Poison"],
    abilities: [
      { name: "Chlorophyll", isMainSeries: true },
      { name: "Overgrow", isMainSeries: true },
    ],
  },
  {
    name: "ivysaur",
    height: 10,
    weight: 130,
    id: "002",
    types: ["Grass", "Poison"],
    abilities: [
      { name: "Chlorophyll", isMainSeries: true },
      { name: "Overgrow", isMainSeries: true },
    ],
  },
];

export default function Command() {
  const [showingDetail, setShowingDetail] = useState(true);
  const { data, isLoading } = useCachedPromise(() => new Promise<Pokemon[]>((resolve) => resolve(pokemons)));

  return (
    <List isLoading={isLoading} isShowingDetail={showingDetail}>
      {data &&
        data.map((pokemon) => {
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
            : { accessories: [{ text: pokemon.types.join(" ") }] };
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
  );
}

```

{% endtab %}

{% tab title="ListWithEmptyView.tsx" %}

```typescript
import { useEffect, useState } from "react";
import { List } from "@raycast/api";

export default function CommandWithCustomEmptyView() {
  const [state, setState] = useState({ searchText: "", items: [] });

  useEffect(() => {
    // perform an API call that eventually populates `items`.
  }, [state.searchText]);

  return (
    <List onSearchTextChange={(newValue) => setState((previous) => ({ ...previous, searchText: newValue }))}>
      {state.searchText === "" && state.items.length === 0 ? (
        <List.EmptyView icon={{ source: "https://placekitten.com/500/500" }} title="Type something to get started" />
      ) : (
        state.items.map((item) => <List.Item key={item} title={item} />)
      )}
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

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| actions | A reference to an [ActionPanel](action-panel.md#actionpanel). It will only be shown when there aren't any children. | <code>React.ReactNode</code> | - |
| children | List sections or items. If [List.Item](list.md#list.item) elements are specified, a default section is automatically created. | <code>React.ReactNode</code> | - |
| filtering | Toggles Raycast filtering. When `true`, Raycast will use the query in the search bar to filter the items. When `false`, the extension needs to take care of the filtering. | <code>boolean</code> or <code>{ keepSectionOrder: boolean }</code> | `false` when `onSearchTextChange` is specified, `true` otherwise. |
| isLoading | Indicates whether a loading bar should be shown or hidden below the search bar | <code>boolean</code> | `false` |
| isShowingDetail | Whether the List should have an area on the right side of the items to show additional details about the selected item. | <code>boolean</code> | - |
| navigationTitle | The main title for that view displayed in Raycast | <code>string</code> | Command title |
| searchBarAccessory | [List.Dropdown](list.md#list.dropdown) that will be shown in the right-hand-side of the search bar. | <code>ReactElement&lt;[List.Dropdown.Props](list.md#props), string></code> | - |
| searchBarPlaceholder | Placeholder text that will be shown in the search bar. | <code>string</code> | `"Search…"` |
| searchText | The text that will be displayed in the search bar. | <code>string</code> | - |
| selectedItemId | Selects the item with the specified id. | <code>string</code> | - |
| throttle | Defines whether the `onSearchTextChange` handler will be triggered on every keyboard press or with a delay for throttling the events. Recommended to set to `true` when using custom filtering logic with asynchronous operations (e.g. network requests). | <code>boolean</code> | `false` |
| onSearchTextChange | Callback triggered when the search bar text changes. | <code>(text: string) => void</code> | - |
| onSelectionChange | Callback triggered when the item selection in the list changes. | <code>(id: string) => void</code> | - |

### List.Dropdown

A dropdown menu that will be shown in the right-hand-side of the search bar.

#### Example

```typescript
import { List } from "@raycast/api";

type DrinkType = { id: string; name: string };

function DrinkDropdown(props: { drinkTypes: DrinkType[]; onDrinkTypeChange: (newValue: string) => void }) {
  const { drinkTypes, onDrinkTypeChange } = props;
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
          <List.Dropdown.Item key={drinkType.id} title={drinkType.name} value={drinkType.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const drinkTypes: DrinkType[] = [
    { id: "1", name: "Beer" },
    { id: "2", name: "Wine" },
  ];
  const onDrinkTypeChange = (newValue: string) => {
    console.log(newValue);
  };
  return (
    <List
      navigationTitle="Search Beers"
      searchBarPlaceholder="Search your favorite drink"
      searchBarAccessory={<DrinkDropdown drinkTypes={drinkTypes} onDrinkTypeChange={onDrinkTypeChange} />}
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

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| tooltip<mark style="color:red;">*</mark> | Tooltip displayed when hovering the dropdown. | <code>string</code> | - |
| children | Dropdown sections or items. If Dropdown.Item elements are specified, a default section is automatically created. | <code>React.ReactNode</code> | - |
| defaultValue | The default value of the dropdown. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. | <code>string</code> | - |
| filtering | Toggles Raycast filtering. When `true`, Raycast will use the query in the search bar to filter the items. When `false`, the extension needs to take care of the filtering. | <code>boolean</code> or <code>{ keepSectionOrder: boolean }</code> | `false` when `onSearchTextChange` is specified, `true` otherwise. |
| id | ID of the dropdown. | <code>string</code> | - |
| isLoading | Indicates whether a loading indicator should be shown or hidden next to the search bar | <code>boolean</code> | `false` |
| placeholder | Placeholder text that will be shown in the dropdown search field. | <code>string</code> | `"Search…"` |
| storeValue | Indicates whether the value of the dropdown should be persisted after selection, and restored next time the dropdown is rendered. | <code>boolean</code> | - |
| throttle | Defines whether the `onSearchTextChange` handler will be triggered on every keyboard press or with a delay for throttling the events. Recommended to set to `true` when using custom filtering logic with asynchronous operations (e.g. network requests). | <code>boolean</code> | `false` |
| value | The currently value of the dropdown. | <code>string</code> | - |
| onChange | Callback triggered when the dropdown selection changes. | <code>(newValue: string) => void</code> | - |
| onSearchTextChange | Callback triggered when the search bar text changes. | <code>(text: string) => void</code> | - |

### List.Dropdown.Item

A dropdown item in a [List.Dropdown](#list.dropdown)

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List
      searchBarAccessory={
        <List.Dropdown tooltip="Dropdown With Items">
          <List.Dropdown.Item title="One" value="one" />
          <List.Dropdown.Item title="Two" value="two" />
          <List.Dropdown.Item title="Three" value="three" />
        </List.Dropdown>
      }
    >
      <List.Item title="Item in the Main List" />
    </List>
  );
}
```

#### Props

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| title<mark style="color:red;">*</mark> | The title displayed for the item. | <code>string</code> | - |
| value<mark style="color:red;">*</mark> | Value of the dropdown item. Make sure to assign each unique value for each item. | <code>string</code> | - |
| icon | An optional icon displayed for the item. | <code>[Image.ImageLike](icons-and-images.md#image.imagelike)</code> | - |
| keywords | An optional property used for providing additional indexable strings for search. When filtering the items in Raycast, the keywords will be searched in addition to the title. | <code>string[]</code> | The title of its section if any |

### List.Dropdown.Section

Visually separated group of dropdown items.

Use sections to group related menu items together.

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List
      searchBarAccessory={
        <List.Dropdown tooltip="Dropdown With Sections">
          <List.Dropdown.Section title="First Section">
            <List.Dropdown.Item title="One" value="one" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Second Section">
            <List.Dropdown.Item title="Two" value="two" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Item title="Item in the Main List" />
    </List>
  );
}
```

#### Props

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| children | The item elements of the section. | <code>React.ReactNode</code> | - |
| title | Title displayed above the section | <code>string</code> | - |

### List.EmptyView

A view to display when there aren't any items available. Use to greet users with a friendly message if the
extension requires user input before it can show any list items e.g. when searching for a package, an article etc.

Raycast provides a default `EmptyView` that will be displayed if the List component either has no children,
or if it has children, but none of them match the query in the search bar. This too can be overridden by passing an
empty view alongside the other `List.Item`s.

Note that the `EmptyView` is _never_ displayed if the `List`'s `isLoading` property is true and the search bar is empty.

![List EmptyView illustration](../../.gitbook/assets/list-empty-view.png)

#### Example

```typescript
import { useEffect, useState } from "react";
import { List } from "@raycast/api";

export default function CommandWithCustomEmptyView() {
  const [state, setState] = useState({ searchText: "", items: [] });

  useEffect(() => {
    // perform an API call that eventually populates `items`.
  }, [state.searchText]);

  return (
    <List onSearchTextChange={(newValue) => setState((previous) => ({ ...previous, searchText: newValue }))}>
      {state.searchText === "" && state.items.length === 0 ? (
        <List.EmptyView icon={{ source: "https://placekitten.com/500/500" }} title="Type something to get started" />
      ) : (
        state.items.map((item) => <List.Item key={item} title={item} />)
      )}
    </List>
  );
}
```

#### Props

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| actions | A reference to an [ActionPanel](action-panel.md#actionpanel). | <code>React.ReactNode</code> | - |
| description | An optional description for why the empty view is shown. | <code>string</code> | - |
| icon | An icon displayed in the center of the EmptyView. | <code>[Image.ImageLike](icons-and-images.md#image.imagelike)</code> | - |
| title | The main title displayed for the Empty View. | <code>string</code> | - |

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
      <List.Item icon={Icon.Star} title="Augustiner Helles" subtitle="0,5 Liter" accessories={[{ text: "Germany" }]} />
    </List>
  );
}
```

#### Props

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| title<mark style="color:red;">*</mark> | The main title displayed for that item, optionally with a tooltip. | <code>string</code> or <code>{ tooltip: string; value: string }</code> | - |
| accessories | An optional array of [List.Item.Accessory](list.md#list.item.accessory) items displayed on the right side in a List.Item. | <code>[List.Item.Accessory](list.md#list.item.accessory)[]</code> | - |
| actions | An [ActionPanel](action-panel.md#actionpanel) that will be updated for the selected list item. | <code>React.ReactNode</code> | - |
| detail | The `List.Item.Detail` to be rendered in the right side area when the parent List is showing details and the item is selected. | <code>React.ReactNode</code> | - |
| icon | An optional icon displayed for the list item. | <code>[Image.ImageLike](icons-and-images.md#image.imagelike)</code> or <code>{ tooltip: string; value: [Image.ImageLike](icons-and-images.md#image.imagelike) }</code> | - |
| id | ID of the item. This string is passed to the `onSelectionChange` handler of the [List](list.md#list) when the item is selected. Make sure to assign each item a unique ID or a UUID will be auto generated. | <code>string</code> | - |
| keywords | An optional property used for providing additional indexable strings for search. When filtering the list in Raycast through the search bar, the keywords will be searched in addition to the title. | <code>string[]</code> | - |
| quickLook | Optional information to preview files with Quick Look. Toggle the preview with [Action.ToggleQuickLook](actions.md#action.togglequicklook). | <code>{ name: string; path: string }</code> | - |
| subtitle | An optional subtitle displayed next to the main title, optionally with a tooltip. | <code>string</code> or <code>{ tooltip: string; value: string }</code> | - |

### List.Item.Detail

A Detail view that will be shown in the right-hand-side of the `List`.

When shown, it is recommended not to show any accessories on the `List.Item` and instead bring those additional information in the `List.Item.Detail` view.

![List-detail illustration](../../.gitbook/assets/list-detail.png)

#### Example

```typescript
import { List } from "@raycast/api";

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

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| isLoading | Indicates whether a loading bar should be shown or hidden above the detail | <code>boolean</code> | `false` |
| markdown | The CommonMark string to be rendered in the right side area when the parent List is showing details and the item is selected. | <code>string</code> | - |
| metadata | The `List.Item.Detail.Metadata` to be rendered in the bottom side of the `List.Item.Detail` | <code>React.ReactNode</code> | - |

### List.Item.Detail.Metadata

A Metadata view that will be shown in the bottom side of the `List.Item.Detail`.

Use it to display additional structured data about the content of the `List.Item`.

#### Example

{% tabs %}

{% tab title="Metadata + Markdown" %}

![List Detail-metadata illustration](../../.gitbook/assets/list-detail-metadata-split.png)

```typescript
import { List } from "@raycast/api";

export default function Metadata() {
  const markdown = `
![Illustration](https://assets.pokemon.com/assets/cms2/img/pokedex/full/001.png)
There is a plant seed on its back right from the day this Pokémon is born. The seed slowly grows larger.
`;
  return (
    <List isShowingDetail>
      <List.Item
        title="Bulbasaur"
        detail={
          <List.Item.Detail
            markdown={markdown}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Types" />
                <List.Item.Detail.Metadata.Label title="Grass" icon="pokemon_types/grass.svg" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Poison" icon="pokemon_types/poison.svg" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Chracteristics" />
                <List.Item.Detail.Metadata.Label title="Height" text="70cm" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Weight" text="6.9 kg" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Abilities" />
                <List.Item.Detail.Metadata.Label title="Chlorophyll" text="Main Series" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Overgrow" text="Main Series" />
                <List.Item.Detail.Metadata.Separator />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </List>
  );
}
```

{% endtab %}

{% tab title="Metadata Standalone" %}

![List Detail-metadata illustration](../../.gitbook/assets/list-detail-metadata-standalone.png)

```typescript
import { List } from "@raycast/api";

export default function Metadata() {
  return (
    <List isShowingDetail>
      <List.Item
        title="Bulbasaur"
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Types" />
                <List.Item.Detail.Metadata.Label title="Grass" icon="pokemon_types/grass.svg" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Poison" icon="pokemon_types/poison.svg" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Chracteristics" />
                <List.Item.Detail.Metadata.Label title="Height" text="70cm" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Weight" text="6.9 kg" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Abilities" />
                <List.Item.Detail.Metadata.Label title="Chlorophyll" text="Main Series" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Overgrow" text="Main Series" />
                <List.Item.Detail.Metadata.Separator />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </List>
  );
}
```

{% endtab %}

{% endtabs %}

#### Props

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| children<mark style="color:red;">*</mark> | The elements of the Metadata view. | <code>React.ReactNode</code> | - |

### List.Item.Detail.Metadata.Label

A title with, optionally, an icon and/or text to its right.

![List Detail-metadata-label illustration](../../.gitbook/assets/list-detail-metadata-label.png)

#### Example

```typescript
import { List } from "@raycast/api";

export default function Metadata() {
  return (
    <List isShowingDetail>
      <List.Item
        title="Bulbasaur"
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Type" icon="pokemon_types/grass.svg" text="Grass" />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </List>
  );
}
```

#### Props

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| title<mark style="color:red;">*</mark> | The title of the item. | <code>string</code> | - |
| icon | An icon to illustrate the value of the item. | <code>[Image.ImageLike](icons-and-images.md#image.imagelike)</code> | - |
| text | The text value of the item. Specifying `color` will display the text in the provided color. Defaults to [Color.SecondaryText](colors.md#color). | <code>string</code> or <code>{ color: [Color](colors.md#color); value: string }</code> | - |

### List.Item.Detail.Metadata.Link

An item to display a link.

![List Detail-metadata-link illustration](../../.gitbook/assets/list-detail-metadata-link.png)

#### Example

```typescript
import { List } from "@raycast/api";

export default function Metadata() {
  return (
    <List isShowingDetail>
      <List.Item
        title="Bulbasaur"
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Link
                  title="Evolution"
                  target="https://www.pokemon.com/us/pokedex/pikachu"
                  text="Raichu"
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </List>
  );
}
```

#### Props

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| target<mark style="color:red;">*</mark> | The target of the link. | <code>string</code> | - |
| text<mark style="color:red;">*</mark> | The text value of the item. | <code>string</code> | - |
| title<mark style="color:red;">*</mark> | The title shown above the item. | <code>string</code> | - |

### List.Item.Detail.Metadata.TagList

A list of [`Tags`](list.md#list.item.detail.metadata.taglist.item) displayed in a row.

![List Detail-metadata-tag-list illustration](../../.gitbook/assets/list-detail-metadata-tag-list.png)

#### Example

```typescript
import { List } from "@raycast/api";

export default function Metadata() {
  return (
    <List isShowingDetail>
      <List.Item
        title="Bulbasaur"
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.TagList title="Type">
                  <List.Item.Detail.Metadata.TagList.Item text="Electric" color={"#eed535"} />
                </List.Item.Detail.Metadata.TagList>
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </List>
  );
}
```

#### Props

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| children<mark style="color:red;">*</mark> | The tags contained in the TagList. | <code>React.ReactNode</code> | - |
| title<mark style="color:red;">*</mark> | The title shown above the item. | <code>string</code> | - |

### List.Item.Detail.Metadata.TagList.Item

A Tag in a `List.Item.Detail.Metadata.TagList`.

#### Props

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| text<mark style="color:red;">*</mark> | The text of the tag. | <code>string</code> | - |
| color | Changes the text color to the provided color and sets a transparent background with the same color. | <code>[Color.ColorLike](colors.md#color.colorlike)</code> | - |
| icon | An optional icon in front of the text of the tag. | <code>[Image.ImageLike](icons-and-images.md#image.imagelike)</code> | - |
| onAction | Callback that is triggered when the item is clicked. | <code>() => void</code> | - |

### List.Item.Detail.Metadata.Separator

A metadata item that shows a separator line. Use it for grouping and visually separating metadata items.

![List Detail-metadata-separator illustration](../../.gitbook/assets/list-detail-metadata-separator.png)

#### Example

```typescript
import { List } from "@raycast/api";

export default function Metadata() {
  return (
    <List isShowingDetail>
      <List.Item
        title="Bulbasaur"
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Type" icon="pokemon_types/grass.svg" text="Grass" />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Type" icon="pokemon_types/poison.svg" text="Poison" />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </List>
  );
}
```

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

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| children | The [List.Item](list.md#list.item) elements of the section. | <code>React.ReactNode</code> | - |
| subtitle | An optional subtitle displayed next to the title of the section. | <code>string</code> | - |
| title | Title displayed above the section. | <code>string</code> | - |

## Types

### List.Item.Accessory

An interface describing an accessory view in a `List.Item`.

![List.Item accessories illustration](../../.gitbook/assets/list-item-accessories.png)

#### Properties

| Property | Description | Type |
| :--- | :--- | :--- |
| tag<mark style="color:red;">*</mark> | A string or Date that will be used as the label, optionally colored. The date is formatted relatively to the current time (for example `new Date()` will be displayed as `"now"`, yesterday's Date will be displayed as "1d", etc.). Color changes the text color to the provided color and sets a transparent background with the same color. Defaults to [Color.SecondaryText](colors.md#color). | <code>string</code> or <code>Date</code> or <code>undefined</code> or <code>null</code> or <code>{ color: [Color.ColorLike](colors.md#color.colorlike); value: string</code> or <code>Date</code> or <code>undefined</code> or <code>null }</code> |
| text | An optional text that will be used as the label, optionally colored. Color changes the text color to the provided color. Defaults to [Color.SecondaryText](colors.md#color). | <code>string</code> or <code>null</code> or <code>{ color: [Color](colors.md#color); value: string</code> or <code>undefined</code> or <code>null }</code> |
| date | An optional Date that will be used as the label, optionally colored. The date is formatted relatively to the current time (for example `new Date()` will be displayed as `"now"`, yesterday's Date will be displayed as "1d", etc.). Color changes the text color to the provided color. Defaults to [Color.SecondaryText](colors.md#color). | <code>Date</code> or <code>null</code> or <code>{ color: [Color](colors.md#color); value: Date</code> or <code>undefined</code> or <code>null }</code> |
| icon | An optional [Image.ImageLike](icons-and-images.md#image.imagelike) that will be used as the icon. | <code>[Image.ImageLike](icons-and-images.md#image.imagelike)</code> or <code>null</code> |
| tooltip | An optional tooltip shown when the accessory is hovered. | <code>string</code> or <code>null</code> |

#### Example

```typescript
import { Color, Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="An Item with Accessories"
        accessories={[
          { text: `An Accessory Text`, icon: Icon.Hammer },
          { text: { value: `A Colored Accessory Text`, color: Color.Orange }, icon: Icon.Hammer },
          { icon: Icon.Person, tooltip: "A person" },
          { text: "Just Do It!" },
          { date: new Date() },
          { tag: new Date() },
          { tag: { value: new Date(), color: Color.Magenta } },
          { tag: { value: "User", color: Color.Magenta }, tooltip: "Tag with tooltip" },
        ]}
      />
    </List>
  );
}
```
