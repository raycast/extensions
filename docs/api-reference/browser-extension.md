# Browser Extension

The Browser Extension API provides developers with deeper integration into the user's Browser _via_ a [Browser Extension](https://raycast.com/browser-extension).

{% hint style="info" %}

Some users might not have installed the Browser Extension. If a user doesn't have the Browser Extension installed, they will be asked if they want to install it when your extension calls the Browser Extension API. If the user doesn't wish to install it, the API call will throw an error.

You can check if a user has the Browser Extension installed using [`environment.canAccess(BrowserExtension)`](./environment.md).

The API is not accessible on Windows for now.

{% endhint %}

## API Reference

### BrowserExtension.getContent

Get the content of an opened browser tab.

#### Signature

```typescript
async function getContent(options?: {
  cssSelector?: string;
  tabId?: number;
  format?: "html" | "text" | "markdown";
}): Promise<string>;
```

#### Example

{% tabs %}
{% tab title="Basic Usage" %}

```typescript
import { BrowserExtension, Clipboard } from "@raycast/api";

export default async function command() {
  const markdown = await BrowserExtension.getContent({ format: "markdown" });

  await Clipboard.copy(markdown);
}
```

{% endtab %}
{% tab title="CSS Selector" %}

```typescript
import { BrowserExtension, Clipboard } from "@raycast/api";

export default async function command() {
  const title = await BrowserExtension.getContent({ format: "text", cssSelector: "title" });

  await Clipboard.copy(title);
}
```

{% endtab %}
{% endtabs %}

#### Parameters

<FunctionParametersTableFromJSDoc name="BrowserExtension.getContent" />

#### Return

A Promise that resolves with the content of the tab.

### BrowserExtension.getTabs

Get the list of open browser tabs.

#### Signature

```typescript
async function getTabs(): Promise<Tab[]>;
```

#### Example

```typescript
import { BrowserExtension } from "@raycast/api";

export default async function command() {
  const tabs = await BrowserExtension.getTabs();
  console.log(tabs);
}
```

#### Return

A Promise that resolves with the list of [tabs](#browserextension.tab).

## Types

### BrowserExtension.Tab

#### Properties

<InterfaceTableFromJSDoc name="BrowserExtension.Tab" />
