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

| Name | Description | Type |
| :--- | :--- | :--- |
| options | Options to control which content to get. | <code>Object</code> |
| options.cssSelector | Only returns the content of the element that matches the [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors).    If the selector matches multiple elements, only the first one is returned.  If the selector doesn't match any element, an empty string is returned.    When using a CSS selector, the `format` option can not be `markdown`. | <code>string</code> |
| options.format | The format of the content.    - `html`: `document.documentElement.outerHTML`  - `text`: `document.body.innerText`  - `markdown`: A heuristic to get the "content" of the document and convert it to markdown. Think of it as the "reader mode" of a browser. | <code>"html"</code> or <code>"text"</code> or <code>"markdown"</code> |
| options.tabId | The ID of the tab to get the content from. If not specified, the content of the active tab of the focused window is returned. | <code>number</code> |

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

| Property | Description | Type |
| :--- | :--- | :--- |
| active<mark style="color:red;">*</mark> | Whether the tab is active in its window.  There can only be one active tab per window but if there are multiple browser windows, there can be multiple active tabs. | <code>boolean</code> |
| id<mark style="color:red;">*</mark> | The ID of the tab. Tab IDs are unique within a browser session. | <code>number</code> |
| url<mark style="color:red;">*</mark> | The URL the tab is displaying. | <code>string</code> |
| favicon | The URL of the tab's [favicon](https://developer.mozilla.org/en-US/docs/Glossary/Favicon). It may also be `undefined` if the tab is loading. | <code>string</code> |
| title | The title of the tab. It may also be `undefined` if the tab is loading. | <code>string</code> |
