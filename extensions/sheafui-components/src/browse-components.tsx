import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  showHUD,
} from "@raycast/api";
import { useState } from "react";

// SheafUI components with their basic usage snippets
const COMPONENTS = [
  {
    name: "accordion",
    title: "Accordion",
    description: "Collapsible content sections",
    snippet: `<x-ui.accordion>
    <x-ui.accordion.item trigger="Accordion Title">
        <p>Accordion content goes here.</p>
    </x-ui.accordion.item>
</x-ui.accordion>`,
  },
  {
    name: "alerts",
    title: "Alert",
    description: "Notification alerts and messages",
    snippet: `<x-ui.alerts type="info">
    This is an alert message.
</x-ui.alerts>`,
  },
  {
    name: "autocomplete",
    title: "Autocomplete",
    description: "Search input with suggestions",
    snippet: `<x-ui.autocomplete
    name="search"
    placeholder="Search..."
    :options="$options"
/>`,
  },
  {
    name: "avatar",
    title: "Avatar",
    description: "User avatar display",
    snippet: `<x-ui.avatar src="/path/to/image.jpg" alt="Profile Picture" />`,
  },
  {
    name: "badge",
    title: "Badge",
    description: "Status badges and labels",
    snippet: `<x-ui.badge variant="primary">Badge</x-ui.badge>`,
  },
  {
    name: "brand",
    title: "Brand",
    description: "Brand/logo component",
    snippet: `<x-ui.brand />`,
  },
  {
    name: "breadcrumbs",
    title: "Breadcrumbs",
    description: "Navigation breadcrumbs",
    snippet: `<x-ui.breadcrumbs>
    <x-ui.breadcrumbs.item href="/">Home</x-ui.breadcrumbs.item>
    <x-ui.breadcrumbs.item href="/products">Products</x-ui.breadcrumbs.item>
    <x-ui.breadcrumbs.item active>Current Page</x-ui.breadcrumbs.item>
</x-ui.breadcrumbs>`,
  },
  {
    name: "button",
    title: "Button",
    description: "Interactive button component",
    snippet: `<x-ui.button>
    Button
</x-ui.button>`,
  },
  {
    name: "card",
    title: "Card",
    description: "Content card container",
    snippet: `<x-ui.card>
    <x-slot name="header">Card Title</x-slot>
    Card content goes here.
</x-ui.card>`,
  },
  {
    name: "checkbox",
    title: "Checkbox",
    description: "Checkbox input",
    snippet: `<x-ui.checkbox name="terms" label="I agree to the terms" />`,
  },
  {
    name: "description",
    title: "Description",
    description: "Description text component",
    snippet: `<x-ui.description>
    This is a description text.
</x-ui.description>`,
  },
  {
    name: "dropdown",
    title: "Dropdown Menu",
    description: "Dropdown menu component",
    snippet: `<x-ui.dropdown>
    <x-slot name="trigger">
        <x-ui.button>Open Menu</x-ui.button>
    </x-slot>
    <x-ui.dropdown.item href="#">Menu Item 1</x-ui.dropdown.item>
    <x-ui.dropdown.item href="#">Menu Item 2</x-ui.dropdown.item>
</x-ui.dropdown>`,
  },
  {
    name: "error",
    title: "Error Message",
    description: "Error message display",
    snippet: `<x-ui.error field="email" />`,
  },
  {
    name: "field",
    title: "Field",
    description: "Form field wrapper",
    snippet: `<x-ui.field label="Email" name="email">
    <x-ui.input type="email" name="email" />
</x-ui.field>`,
  },
  {
    name: "fieldset",
    title: "Fieldset",
    description: "Form fieldset grouping",
    snippet: `<x-ui.fieldset legend="Personal Information">
    <!-- Form fields here -->
</x-ui.fieldset>`,
  },
  {
    name: "heading",
    title: "Heading",
    description: "Heading text component",
    snippet: `<x-ui.heading level="h2" size="lg">Heading Text</x-ui.heading>`,
  },
  {
    name: "icon",
    title: "Icon",
    description: "Icon component (Phosphor icons)",
    snippet: `<x-ui.icon name="ps:house" class="size-5" />`,
  },
  {
    name: "input",
    title: "Input Field",
    description: "Text input component",
    snippet: `<x-ui.input type="text" name="username" placeholder="Enter username" />`,
  },
  {
    name: "key-value",
    title: "Key Value Pair",
    description: "Key-value pair input",
    snippet: `<x-ui.key-value name="env_vars" />`,
  },
  {
    name: "label",
    title: "Label",
    description: "Form label component",
    snippet: `<x-ui.label for="email">Email Address</x-ui.label>`,
  },
  {
    name: "link",
    title: "Link",
    description: "Anchor link component",
    snippet: `<x-ui.link href="/path">Link Text</x-ui.link>`,
  },
  {
    name: "modal",
    title: "Modal Dialog",
    description: "Modal/dialog component",
    snippet: `<x-ui.modal.trigger id="my-modal">
    <x-ui.button>Open Modal</x-ui.button>
</x-ui.modal.trigger>

<x-ui.modal id="my-modal" heading="Modal Title">
    <p>Modal content goes here.</p>
</x-ui.modal>`,
  },
  {
    name: "otp",
    title: "OTP Input",
    description: "One-time password input",
    snippet: `<x-ui.otp name="otp" length="6" />`,
  },
  {
    name: "popover",
    title: "Popover",
    description: "Popover tooltip",
    snippet: `<x-ui.popover>
    <x-slot name="trigger">
        <x-ui.button>Hover me</x-ui.button>
    </x-slot>
    Popover content here.
</x-ui.popover>`,
  },
  {
    name: "radio",
    title: "Radio Group",
    description: "Radio button group",
    snippet: `<x-ui.radio name="plan" value="monthly" label="Monthly" />
<x-ui.radio name="plan" value="yearly" label="Yearly" />`,
  },
  {
    name: "select",
    title: "Select",
    description: "Dropdown select input",
    snippet: `<x-ui.select name="country" placeholder="Select a country">
    <x-ui.select.option value="us">United States</x-ui.select.option>
    <x-ui.select.option value="mx">Mexico</x-ui.select.option>
    <x-ui.select.option value="ca">Canada</x-ui.select.option>
</x-ui.select>`,
  },
  {
    name: "separator",
    title: "Separator",
    description: "Visual separator/divider",
    snippet: `<x-ui.separator />`,
  },
  {
    name: "slider",
    title: "Slider",
    description: "Range slider input",
    snippet: `<x-ui.slider name="volume" min="0" max="100" value="50" />`,
  },
  {
    name: "switch",
    title: "Switch Toggle",
    description: "Toggle switch component",
    snippet: `<x-ui.switch name="notifications" label="Enable notifications" />`,
  },
  {
    name: "tabs",
    title: "Tabs",
    description: "Tab navigation component",
    snippet: `<x-ui.tabs>
    <x-ui.tabs.list>
        <x-ui.tabs.trigger value="tab1">Tab 1</x-ui.tabs.trigger>
        <x-ui.tabs.trigger value="tab2">Tab 2</x-ui.tabs.trigger>
    </x-ui.tabs.list>
    <x-ui.tabs.content value="tab1">Tab 1 content</x-ui.tabs.content>
    <x-ui.tabs.content value="tab2">Tab 2 content</x-ui.tabs.content>
</x-ui.tabs>`,
  },
  {
    name: "tags-input",
    title: "Tags Input",
    description: "Multi-tag input field",
    snippet: `<x-ui.tags-input name="tags" placeholder="Add tags..." />`,
  },
  {
    name: "text",
    title: "Text",
    description: "Text display component",
    snippet: `<x-ui.text>This is a paragraph of text.</x-ui.text>`,
  },
  {
    name: "textarea",
    title: "Textarea",
    description: "Multi-line text input",
    snippet: `<x-ui.textarea name="message" placeholder="Enter your message..." rows="4" />`,
  },
  {
    name: "theme-switcher",
    title: "Theme Switcher",
    description: "Dark/light theme toggle",
    snippet: `<x-ui.theme-switcher />`,
  },
  {
    name: "toast",
    title: "Toast Notification",
    description: "Toast notification system",
    snippet: `{{-- Add to layout --}}
<x-ui.toasts />

{{-- Trigger via Alpine.js --}}
<button x-on:click="$dispatch('notify', { type: 'success', content: 'Success!' })">
    Show Toast
</button>`,
  },
  {
    name: "tooltip",
    title: "Tooltip",
    description: "Hover tooltip component",
    snippet: `<x-ui.tooltip content="Tooltip text">
    <x-ui.button>Hover me</x-ui.button>
</x-ui.tooltip>`,
  },
];

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const filteredComponents = COMPONENTS.filter(
    (c) =>
      c.name.toLowerCase().includes(searchText.toLowerCase()) ||
      c.title.toLowerCase().includes(searchText.toLowerCase()) ||
      c.description.toLowerCase().includes(searchText.toLowerCase()),
  );

  async function copySnippet(component: (typeof COMPONENTS)[0]) {
    await Clipboard.copy(component.snippet);
    await showHUD(`✓ Copied ${component.title}`);
  }

  return (
    <List
      searchBarPlaceholder="Search SheafUI components..."
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {filteredComponents.map((component) => (
        <List.Item
          key={component.name}
          title={component.title}
          subtitle={component.description}
          icon={Icon.Code}
          accessories={[{ tag: `<x-ui.${component.name}>` }]}
          actions={
            <ActionPanel>
              <Action
                title="Copy Snippet"
                icon={Icon.Clipboard}
                onAction={() => copySnippet(component)}
              />
              <Action.CopyToClipboard
                title="Copy Component Tag"
                content={`<x-ui.${component.name}>`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.OpenInBrowser
                title="Open Documentation"
                url={`https://sheafui.dev/docs/components/${component.name}`}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action.CopyToClipboard
                title="Copy Install Command"
                content={`php artisan sheaf:install ${component.name}`}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
