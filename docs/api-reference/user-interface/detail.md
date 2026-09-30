# Detail

![](../../.gitbook/assets/detail.webp)

## API Reference

### Detail

Renders a markdown ([CommonMark](https://commonmark.org)) string with an optional metadata panel.

Typically used as a standalone view or when navigating from a [List](list.md).

#### Example

{% tabs %}
{% tab title="Render a markdown string" %}

```typescript
import { Detail } from "@raycast/api";

export default function Command() {
  return <Detail markdown="**Hello** _World_!" />;
}
```

{% endtab %}

{% tab title="Render an image from the assets directory" %}

```typescript
import { Detail } from "@raycast/api";

export default function Command() {
  return <Detail markdown={`![Image Title](example.png)`} />;
}
```

{% endtab %}
{% endtabs %}

#### Props

<PropsTableFromJSDoc component="Detail" />

{% hint style="info" %}
You can specify custom image dimensions by adding a `raycast-width` and `raycast-height` query string to the markdown image. For example: `![Image Title](example.png?raycast-width=250&raycast-height=250)`

You can also specify a tint color to apply to an markdown image by adding a `raycast-tint-color` query string. For example: `![Image Title](example.png?raycast-tintColor=blue)`
{% endhint %}

{% hint style="info" %}
You can now render [LaTeX](https://www.latex-project.org) in the markdown. We support the following delimiters:

- Inline math: `\(...\)` and `\begin{math}...\end{math}`
- Display math: `\[...\]`, `$$...$$` and `\begin{equation}...\end{equation}`

{% endhint %}

### Detail.Metadata

A Metadata view that will be shown in the right-hand-side of the `Detail`.

Use it to display additional structured data about the main content shown in the `Detail` view.

![Detail-metadata illustration](../../.gitbook/assets/detail-metadata.webp)

#### Example

```typescript
import { Detail } from "@raycast/api";

// Define markdown here to prevent unwanted indentation.
const markdown = `
# Pikachu

![](https://assets.pokemon.com/assets/cms2/img/pokedex/full/025.png)

Pikachu that can generate powerful electricity have cheek sacs that are extra soft and super stretchy.
`;

export default function Main() {
  return (
    <Detail
      markdown={markdown}
      navigationTitle="Pikachu"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Height" text={`1' 04"`} />
          <Detail.Metadata.Label title="Weight" text="13.2 lbs" />
          <Detail.Metadata.TagList title="Type">
            <Detail.Metadata.TagList.Item text="Electric" color={"#eed535"} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Evolution" target="https://www.pokemon.com/us/pokedex/pikachu" text="Raichu" />
        </Detail.Metadata>
      }
    />
  );
}
```

#### Props

<PropsTableFromJSDoc component="Detail.Metadata" />

### Detail.Metadata.Label

A single value with an optional icon.

![Detail-metadata-label illustration](../../.gitbook/assets/detail-metadata-label.webp)

#### Example

```typescript
import { Detail } from "@raycast/api";

// Define markdown here to prevent unwanted indentation.
const markdown = `
# Pikachu

![](https://assets.pokemon.com/assets/cms2/img/pokedex/full/025.png)

Pikachu that can generate powerful electricity have cheek sacs that are extra soft and super stretchy.
`;

export default function Main() {
  return (
    <Detail
      markdown={markdown}
      navigationTitle="Pikachu"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Height" text={`1' 04"`} icon="weight.svg" />
        </Detail.Metadata>
      }
    />
  );
}
```

#### Props

<PropsTableFromJSDoc component="Detail.Metadata.Label" />

### Detail.Metadata.Link

An item to display a link.

![Detail-metadata-link illustration](../../.gitbook/assets/detail-metadata-link.webp)

#### Example

```typescript
import { Detail } from "@raycast/api";

// Define markdown here to prevent unwanted indentation.
const markdown = `
# Pikachu

![](https://assets.pokemon.com/assets/cms2/img/pokedex/full/025.png)

Pikachu that can generate powerful electricity have cheek sacs that are extra soft and super stretchy.
`;

export default function Main() {
  return (
    <Detail
      markdown={markdown}
      navigationTitle="Pikachu"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Evolution" target="https://www.pokemon.com/us/pokedex/pikachu" text="Raichu" />
        </Detail.Metadata>
      }
    />
  );
}
```

#### Props

<PropsTableFromJSDoc component="Detail.Metadata.Link" />

### Detail.Metadata.TagList

A list of [`Tags`](detail.md#detail.metadata.taglist.item) displayed in a row.

![Detail-metadata-taglist illustration](../../.gitbook/assets/detail-metadata-taglist.webp)

#### Example

```typescript
import { Detail } from "@raycast/api";

// Define markdown here to prevent unwanted indentation.
const markdown = `
# Pikachu

![](https://assets.pokemon.com/assets/cms2/img/pokedex/full/025.png)

Pikachu that can generate powerful electricity have cheek sacs that are extra soft and super stretchy.
`;

export default function Main() {
  return (
    <Detail
      markdown={markdown}
      navigationTitle="Pikachu"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Type">
            <Detail.Metadata.TagList.Item text="Electric" color={"#eed535"} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}
```

#### Props

<PropsTableFromJSDoc component="Detail.Metadata.TagList" />

### Detail.Metadata.TagList.Item

A Tag in a `Detail.Metadata.TagList`.

#### Props

<PropsTableFromJSDoc component="Detail.Metadata.TagList.Item" />

### Detail.Metadata.Separator

A metadata item that shows a separator line. Use it for grouping and visually separating metadata items.

![](../../.gitbook/assets/detail-metadata-separator.webp)

```typescript
import { Detail } from "@raycast/api";

// Define markdown here to prevent unwanted indentation.
const markdown = `
# Pikachu

![](https://assets.pokemon.com/assets/cms2/img/pokedex/full/025.png)

Pikachu that can generate powerful electricity have cheek sacs that are extra soft and super stretchy.
`;

export default function Main() {
  return (
    <Detail
      markdown={markdown}
      navigationTitle="Pikachu"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Height" text={`1' 04"`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Weight" text="13.2 lbs" />
        </Detail.Metadata>
      }
    />
  );
}
```
