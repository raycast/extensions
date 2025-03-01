---
description: Learn about the templates provided by Raycast to help kickstart your extension.
---

# Templates and Boilerplates

Raycast provides developers with a variety of templates to assist in kick-starting your extension development journey.

Raycast provides 3 types of templates:

- **Commands:** These are templates for different views for commands within your extension.
- **Tools:** Tools are a type of entry point for an extension different from a command. Learn more about Tools [here](../api-reference/tool.md).
- **Extension Boilerplates:** These are fully built extension templates designed for use by organizations.

## Commands

### Show Detail

<details>
<summary>Renders a simple Hello World from a markdown string. </summary>

![Detail Template Render](../.gitbook/assets/detail-template.webp)
{% hint style="info" %}
See the [API Reference](../api-reference/user-interface/detail.md) for more information about customization.
{% endhint %}

</details>

### Submit Form

<details>
<summary>Renders a form that showcases all available form elements.</summary>

![Submit Form Template Render](../.gitbook/assets/form-template.webp)
{% hint style="info" %}
See the [API Reference](../api-reference/user-interface/form.md) for more information about customization.
{% endhint %}

</details>

### Show Grid

<details>

<summary>Renders a grid of Icons available from Raycast.</summary>
Defaults to a large grid, but provides a selection menu to change the size.

![Grid Template Render](../.gitbook/assets/grid-template.webp)
{% hint style="info" %}
See the [API Reference](../api-reference/user-interface/grid.md) for more information about customization.

See here for information about [Icons](../api-reference/user-interface/icons-and-images.md).
{% endhint %}

</details>

### Show List and Detail

<details>
<summary>Renders a list of options. When an option is selected, a Detail view is displayed.</summary>

![List and Detail Template Render](../.gitbook/assets/list-detail-template.webp)
{% hint style="info" %}
See the [API Reference](../api-reference/user-interface/list.md) for more information about customization.
{% endhint %}

</details>

### Menu Bar Extra

<details>
<summary>Adds a simple Menu Bar Extra with a menu.</summary>

![Menu Bar Extra Template Render](../.gitbook/assets/menu-bar-template.webp)
{% hint style="info" %}
See the [API Reference](../api-reference/menu-bar-commands.md) for more information about customization.
{% endhint %}

</details>

### Run Script

Renders a simple [HUD](../api-reference/feedback/hud.md) indicating the completion of the script.

### Show List

<details>
<summary>Renders a simple list with each entry containing an icon, title, subtitle, and accessory.</summary>

![List Template Render](../.gitbook/assets/list-template.webp)
{% hint style="info" %}
See the [API Reference](../api-reference/user-interface/list.md) for more information about customization.
{% endhint %}

</details>

### Show Typeahead Results

<details>
<summary>Renders a searchable list of NPM packages. Returned packages updates as search.</summary>

![Typeahead Results Template Render](../.gitbook/assets/typeahead-results-template.webp)

</details>

### AI

<details>
<summary>Renders output from an AI command in a Detail view.</summary>

![AI Template Render](../.gitbook/assets/ai-template.webp)

</details>

## Tools

<details>

<summary>Renders a barebones Quick AI chat with your extension.</summary>

![Tool with Confirmation Template Render](../.gitbook/assets/tool-with-confirmation-template.webp)
{% hint style="info" %}
See the [API Reference](../api-reference/tool.md) for more information about customization.
{% endhint %}

</details>

## Extension Boilerplates

The Raycast Team has created high-quality templates to reinforce team experiences with the Raycast API.

Run `npm init raycast-extension -t <template-name>` to get started with these extensions. All templates can be found on the [templates page](https://www.raycast.com/templates).

Specific instructions about customizing the template can be found on the relevant [template page](https://www.raycast.com/templates). Simply customize the template as you see fit, then run `npm run publish` in the extension directory to allow your team to install the extension.
