---
description: Learn about the templates provided by Raycast to help kickstart your extension.
---

# Templates

Raycast provides a variety of templates to kickstart your extension.

Raycast provides 3 types of templates:

- **Commands:** These are templates for [commands](../terminology.md).
- **Tools:** These are templates for [tools](../terminology.md#tool). You can select a different one for each tool that you add to your extension.
- **Extension Boilerplates:** These are fully built extensions designed to be tweaked by organizations for internal use.

## Commands

### Show Detail

<details>
<summary>Renders a simple Hello World from a markdown string. </summary>

![Detail Template Render](../../.gitbook/assets/detail-template.webp)
{% hint style="info" %}
See the [API Reference](../../api-reference/user-interface/detail.md) for more information about customization.
{% endhint %}

</details>

### Submit Form

<details>
<summary>Renders a form that showcases all available form elements.</summary>

![Submit Form Template Render](../../.gitbook/assets/form-template.webp)
{% hint style="info" %}
See the [API Reference](../../api-reference/user-interface/form.md) for more information about customization.
{% endhint %}

</details>

### Show Grid

<details>

<summary>Renders a grid of Icons available from Raycast.</summary>
Defaults to a large grid, but provides a selection menu to change the size.

![Grid Template Render](../../.gitbook/assets/grid-template.webp)
{% hint style="info" %}
See the [API Reference](../../api-reference/user-interface/grid.md) for more information about customization.

See here for information about [Icons](../../api-reference/user-interface/icons-and-images.md).
{% endhint %}

</details>

### Show List and Detail

<details>
<summary>Renders a list of options. When an option is selected, a Detail view is displayed.</summary>

![List and Detail Template Render](../../.gitbook/assets/list-detail-template.webp)
{% hint style="info" %}
See the [API Reference](../../api-reference/user-interface/list.md) for more information about customization.
{% endhint %}

</details>

### Menu Bar Extra

<details>
<summary>Adds a simple Menu Bar Extra with a menu.</summary>

![Menu Bar Extra Template Render](../../.gitbook/assets/menu-bar-template.webp)
{% hint style="info" %}
See the [API Reference](../../api-reference/menu-bar-commands.md) for more information about customization.
{% endhint %}

</details>

### Run Script

A example of a no-view command which shows a simple [HUD](../../api-reference/feedback/hud.md).

### Show List

<details>
<summary>Renders a static list with each entry containing an icon, title, subtitle, and accessory.</summary>

![List Template Render](../../.gitbook/assets/list-template.webp)
{% hint style="info" %}
See the [API Reference](../../api-reference/user-interface/list.md) for more information about customization.
{% endhint %}

</details>

### Show Typeahead Results

<details>
<summary>Renders a dynamic and searchable list of NPM packages. The command fetches new items as the search is updated by the user.</summary>

![Typeahead Results Template Render](../../.gitbook/assets/typeahead-results-template.webp)

</details>

### AI

<details>
<summary>Renders the output of an AI call in a Detail view.</summary>

![AI Template Render](../../.gitbook/assets/ai-template.webp)

</details>

## Tools

<details>

<summary>A simple tool which asks for confirmation before executing.</summary>

![Tool with Confirmation Template Render](../../.gitbook/assets/tool-with-confirmation-template.webp)
{% hint style="info" %}
See the [API Reference](../../api-reference/tool.md) for more information about customization.
{% endhint %}

</details>

## Extension Boilerplates

The Raycast Team has created high-quality templates to reinforce team experiences with the Raycast API.

Run `npm init raycast-extension -t <template-name>` to get started with these extensions. All templates can be found on the [templates page](https://www.raycast.com/templates).

Specific instructions about customizing the template can be found on the relevant [template page](https://www.raycast.com/templates). Simply customize the template as you see fit, then run `npm run publish` in the extension directory to allow your team to install the extension.
