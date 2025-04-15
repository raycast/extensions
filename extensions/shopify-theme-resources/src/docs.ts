import { DocType } from "./types/types";

export const docList: DocType[] = [
  {
    section: {
      sectionTitle: "Basics",
      items: [
        {
          title: "Architecture",
          url: "https://shopify.dev/docs/storefronts/themes/architecture",
          keyword: ["architecture"],
          category: "Basics",
          subcategory: "Architecture",
          description:
            "A theme controls the organization, features, and style of a merchant's online store. Theme code is organized with a [standard directory structure of files specific to Shopify themes](https://shopify.dev/docs/storefronts/themes/architecture#directory-structure-and-component-types), as well as supporting assets such as images, stylesheets, and scripts. To learn how themes fit into Shopify, and learn how to set up an environment to build and test themes, [refer to the Shopify themes overview](https://shopify.dev/docs/storefronts/themes).",
        },
        {
          title: "Layout",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/layouts",
          keyword: ["layout"],
          category: "Basics",
          subcategory: "Layout",
          description: `Layouts are the base of the theme, through which all templates are rendered. \n\n Layouts are Liquid files that allow you to include content, that should be repeated on multiple page types, in a single location. For example, layouts are a good place to include any content you might want in your <head> element, as well as headers and footers. \n\n You can edit the default theme.liquid layout, or you can create multiple custom layout files to suit your needs. You can specify which layout to use, or whether to use a layout at all, at the template level: \n\n - In JSON templates, the layout that's used to render a page is specified using the layout attribute. \n\n - In Liquid templates, the layout that's used to render a page is specified using the layout Liquid tag.`,
        },
        {
          title: "Templates",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/templates",
          keyword: ["templates"],
          category: "Basics",
          subcategory: "Templates",
          description: `Templates control what's rendered on each type of page in a theme. \n\n Each page type in an online store has an associated template type. You can use the template to add functionality that makes sense for the page type. For example, to render a product page, the theme needs at least one template of type \`product\`. Similarly, to render a metaobject page, the theme needs at least one template of type \`metaobject/{metaobject-type}\`, for example: \`metaobject/book\` or \`metaobject/author\`, depending on the type of metaobject definition. \n\n You can create multiple versions of the same template type to create custom templates for different use cases. For example, you can create a separate product template for outerwear products, or a separate page template for pages with video content.`,
        },
        {
          title: "Sections",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/sections",
          keyword: ["sections"],
          category: "Basics",
          subcategory: "Sections",
          description: `Sections are Liquid files that allow you to create reusable modules of content that can be customized by merchants. They can also include blocks which allow merchants to add, remove, and reorder content within a section. \n\n For example, you can create an Image with text section that displays an image and text side-by-side with options for merchants to choose the image, set the text, and select the display order. \n\n Sections can be dynamically added to pages using JSON templates or section groups, giving merchants flexibility to easily customize page layouts. Sections that are included in JSON templates or section groups can support app blocks, which give merchants the option to include app content within a section without having to edit theme code. JSON templates and section groups can render up to 25 sections, and each section can have up to 50 blocks. \n\n Sections can also be included statically, which can provide merchants with in-context customization options for static content. \n\n By default, sections are available for any template or section group. You can limit which templates and section groups have access in the section schema.`,
        },
        {
          title: "Section Groups",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/section-groups",
          keyword: ["section groups"],
          category: "Basics",
          subcategory: "Section Groups",
          description: `A section group is a JSON data file that stores a list of sections and app blocks to be rendered, and their associated settings. Merchants can add sections to the section group, as well as remove and reorder them, in the theme editor. \n\n The sections and app blocks referenced in a section group are rendered in the order specified by the order attribute, with no markup between the sections. Section groups can render up to 25 sections, and each section can have up to 50 blocks. \n\n The sections and app blocks referenced in section groups are the same sections and app blocks referenced in templates, and should follow the same guidelines.`,
        },
        {
          title: "Blocks",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/blocks",
          keyword: ["blocks"],
          category: "Basics",
          subcategory: "Blocks",
          description: `Blocks let developers create flexible layouts by breaking down sections into smaller, reusable pieces of Liquid. Each block has it’s own set of settings, and can be added, removed, and reordered within a section. \n\n There are three types of blocks: \n\n - Theme blocks: Created as their own Liquid files in the /blocks folder, and re-usable across multiple sections with the theme. \n\n - Section blocks: Created within a section’s Liquid file and are limited to use within that section. \n\n - App blocks: Provided by apps installed on a merchant’s shop.`,
        },
        {
          title: "Settings",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings",
          keyword: ["settings"],
          category: "Basics",
          subcategory: "Settings",
          description: `To make it easier for merchants to customize your theme, you can use JSON to create settings that merchants can access through the theme editor. \n\n You can provide settings at the theme, section, or block level. Settings can be fixed (such as informational elements) or interactive (such as a drop-down menu). Setting values can be static, or use dynamic sources to render contextually appropriate values. \n\n Exposing settings makes your theme more customizable so it can better express a merchant's brand. It also can make your theme more flexible so that you can address various use cases for merchants.`,
        },
        {
          title: "Config",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/config",
          keyword: ["config"],
          category: "Basics",
          subcategory: "Config",
          description: `Config files define settings in the Theme settings area of the theme editor, as well as store their values. \n\nTheme settings are a good place to host general settings such as typography and color options. Theme settings can be accessed through the settings object.`,
        },
        {
          title: "Locale",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/locales",
          keyword: ["locale"],
          category: "Basics",
          subcategory: "Locale",
          description: `Locale files are JSON files that contain a set of translations for text strings used throughout the theme and theme editor. \n\n In addition to giving merchants a single place to easily edit words and phrases that are repeated throughout the theme, locale files allow you translate storefront content, and theme editor settings, to multiple languages for international merchants and customers.`,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Settings",
      items: [
        {
          title: "checkbox",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#checkbox",
          keyword: ["settings", "input"],
          category: "Settings",
          subcategory: "Basic Input Settings",
          description: `A setting of type \`checkbox\` outputs a checkbox field. This setting type can be used for toggling features on and off, such as whether to show an announcement bar. \n\n When accessing the value of a \`checkbox\` type setting, data is returned as a boolean. \n\n If \`default\` is unspecified, then the value is \`false\` by default.`,
          example: `
{
  "type": "checkbox",
  "id": "show_announcement",
  "label": "Show announcement",
  "default": true
}
          `,
        },
        {
          title: "number",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#number",
          keyword: ["settings", "input"],
          category: "Settings",
          subcategory: "Basic Input Settings",
          description: `A setting of type \`number\` outputs a single number field. You can use this setting type to capture a varying numerical value, such as the number of products to show per page on a collection page. \n\n Additional attributes: \n\n - \`placeholder\`: A placeholder value for the input (optional) \n\n When accessing the value of a \`number\` type setting, data is returned as either: \n\n - A number \n\n - nil, if nothing has been entered \n\n ## ⚠️ Caution \n\n The \`default\` attribute is optional. However, the value must be a number and not a string.
          
\`\`\`json      
{
  "type": "number",
  "id": "products_per_page",
  "label": "Products per page",
  "default": 20
}
\`\`\`
          `,
        },
        {
          title: "radio",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#radio",
          keyword: ["settings", "input"],
          category: "Settings",
          subcategory: "Basic Input Settings",
          description: `A setting of type \`radio\` outputs a radio option field. \n\n Additional required attributes: \n\n - \`options\`: An array of \`value\` and \`label\` definitions \n\n When accessing the value of a \`radio\` type setting, data is returned as a string. \n\n If \`default\` is unspecified, then the first option is selected by default.`,
          example: `
{
  "type": "radio",
  "id": "logo_aligment",
  "label": "Logo alignment",
  "options": [
    {
      "value": "left",
      "label": "Left"
    },
    {
      "value": "centered",
      "label": "Centered"
    }
  ],
  "default": "left"
}
          `,
        },
        {
          title: "range",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#range",
          keyword: ["settings", "input"],
          category: "Settings",
          subcategory: "Basic Input Settings",
          description: `A setting of type \`range\` outputs a range slider field with an input field. \n\n Additional attributes: \n\n - \`min\`: The minimum value (required) \n\n - \`max\`: The maximum value (required) \n\n - \`step\`: The increment size between steps (optional, defaults to 1) \n\n - \`unit\`: The unit for the input (optional) \n\n When accessing the value of a \`range\` type setting, data is returned as a number. \n\n ## ⚠️ Caution \n\n The \`default\` attribute is required. The \`min\`, \`max\`, \`step\`, and \`default\` attributes can't be string values.`,
          example: `
{
  "type": "range",
  "id": "font_size",
  "min": 12,
  "max": 24,
  "step": 1,
  "unit": "px",
  "label": "Font size",
  "default": 16
}
            `,
        },
        {
          title: "select",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#select",
          keyword: ["settings", "input"],
          category: "Settings",
          subcategory: "Basic Input Settings",
          description: `A setting of type \`select\` outputs different selector fields. \n\n Additional attributes: \n\n - \`options\`: An array of value/label definitions (required) \n\n - \`group\`: Optional grouping for options \n\n Renders as either: \n\n - DropDown: When using groups, >5 options, or long options \n\n - SegmentedControl: 2-5 options that fit container \n\n When accessing the value of a \`select\` type setting, data is returned as a string. \n\n If \`default\` is unspecified, then the first option is selected by default.`,
          example: `
{
  "type": "select",
  "id": "vertical_alignment",
  "label": "Vertical alignment",
  "options": [
    {
      "value": "top",
      "label": "Top"
    },
    {
      "value": "middle",
      "label": "Middle"
    },
    {
      "value": "bottom",
      "label": "Bottom"
    }
  ],
  "default": "middle"
}
          `,
        },
        {
          title: "text",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#text",
          keyword: ["settings", "input"],
          category: "Settings",
          subcategory: "Basic Input Settings",
          description: `A setting of type \`text\` outputs a single-line text field. \n\n Additional attributes: \n\n - \`placeholder\`: A placeholder value for the input (optional) \n\n When accessing the value of a \`text\` type setting, data is returned as either: \n\n - A string \n\n - An empty object, if nothing has been entered \n\n ## Note \n\n Settings of type \`text\` are not updated when switching presets.`,
          example: `
{
  "type": "text",
  "id": "footer_linklist_title",
  "label": "Heading",
  "default": "Quick links"
}
          `,
        },
        {
          title: "textarea",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#textarea",
          keyword: ["settings", "input"],
          category: "Settings",
          subcategory: "Basic Input Settings",
          description: `A setting of type \`textarea\` outputs a multi-line text field. \n\n Additional attributes: \n\n - \`placeholder\`: A placeholder value for the input (optional) \n\n When accessing the value of a \`textarea\` type setting, data is returned as either: \n\n - A string \n\n - An empty object, if nothing has been entered`,
          example: `
{
  "type": "textarea",
  "id": "home_welcome_message",
  "label": "Welcome message",
  "default": "Welcome to my shop!"
}
          `,
        },
        {
          title: "article",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#article",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`article\` outputs an article picker field. \n\n When accessing the value of an \`article\` type setting, data is returned as either: \n\n - An [article object](https://shopify.dev/docs/api/liquid/objects/article) \n\n - nil, if no article is selected`,
          example: `
{
  "type": "article",
  "id": "article",
  "label": "Article"
}
          `,
        },
        {
          title: "blog",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#blog",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`blog\` outputs a blog picker field. \n\n When accessing the value of a \`blog\` type setting, data is returned as either: \n\n - A [blog object](https://shopify.dev/docs/api/liquid/objects/blog) \n\n - nil, if no blog is selected
          `,
          example: `
{
  "type": "blog",
  "id": "blog",
  "label": "Blog"
}
          `,
        },
        {
          title: "collection",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#collection",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`collection\` outputs a collection picker field. \n\n When accessing the value of a \`collection\` type setting, data is returned as either: \n\n - A [collection object](https://shopify.dev/docs/api/liquid/objects/collection) \n\n - nil, if no collection is selected
          `,
          example: `
{
  "type": "collection",
  "id": "collection",
  "label": "Collection"
}
          `,
        },
        {
          title: "collection_list",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#collection_list",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`collection_list\` outputs a collection list picker field. \n\n When accessing the value of a \`collection_list\` type setting, data is returned as either: \n\n - An array of [collection objects](https://shopify.dev/docs/api/liquid/objects/collection) \n\n - An empty array, if no collections are selected
          `,
          example: `
{
  "type": "collection_list",
  "id": "collection_list",
  "label": "Collections",
  "limit": 8
}
          `,
        },
        {
          title: "color",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#color",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`color\` outputs a color picker field. \n\n Additional attributes: \n\n - \`opacity\`: Whether the color picker should include opacity control (optional) \n\n When accessing the value of a \`color\` type setting, data is returned as either: \n\n - A CSS color value \n\n - nil, if no color is selected \n\n ## Note \n\n The \`default\` attribute is required and must be a valid CSS color value.
          `,
          example: `
{
  "type": "color",
  "id": "body_text",
  "label": "Body text",
  "default": "#000000"
}
          `,
        },
        {
          title: "color_background",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#color_background",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`color_background\` outputs a color picker field optimized for background colors. \n\n Additional attributes: \n\n - \`opacity\`: Whether the color picker should include opacity control (optional) \n\n When accessing the value of a \`color_background\` type setting, data is returned as either: \n\n - A CSS color value \n\n - nil, if no color is selected \n\n ## Note \n\n The \`default\` attribute is required and must be a valid CSS color value.
          `,
          example: `
{
  "type": "color_background",
  "id": "background",
  "label": "Background",
  "default": "linear-gradient(#ffffff, #000000)"
}
          `,
        },
        {
          title: "color_scheme",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#color_scheme",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`color_scheme\` outputs a color scheme picker field. \n\n When accessing the value of a \`color_scheme\` type setting, data is returned as a [color scheme object](https://shopify.dev/themes/architecture/settings/color-schemes#color-scheme-object).
          `,
          example: `
{
    "type": "color_scheme",
    "id": "color_scheme",
    "default": "scheme_1",
    "label": "Color scheme"
}
          `,
        },
        {
          title: "color_scheme_group",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#color_scheme_group",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`color_scheme_group\` outputs a color scheme group picker field. \n\n When accessing the value of a \`color_scheme_group\` type setting, data is returned as a [color scheme group object](https://shopify.dev/themes/architecture/settings/color-schemes#color-scheme-group-object).
          `,
          example: `
{
  "type": "color_scheme_group",
  "id": "color_schemes",
  "definition": [
    {
      "type": "color",
      "id": "background",
      "label": "t:settings_schema.colors.settings.background.label",
      "default": "#FFFFFF"
    },
    {
      "type": "color_background",
      "id": "background_gradient",
      "label": "t:settings_schema.colors.settings.background_gradient.label",
      "info": "t:settings_schema.colors.settings.background_gradient.info"
    },
    {
      "type": "color",
      "id": "text",
      "label": "t:settings_schema.colors.settings.text.label",
      "default": "#121212"
    },
    {
      "type": "color",
      "id": "button",
      "label": "t:settings_schema.colors.settings.button_background.label",
      "default": "#121212"
    },
    {
      "type": "color",
      "id": "button_label",
      "label": "t:settings_schema.colors.settings.button_label.label",
      "default": "#FFFFFF"
    },
    {
      "type": "color",
      "id": "secondary_button_label",
      "label": "t:settings_schema.colors.settings.secondary_button_label.label",
      "default": "#121212"
    },
    {
      "type": "color",
      "id": "shadow",
      "label": "t:settings_schema.colors.settings.shadow.label",
      "default": "#121212"
    }
  ],
  "role": {
    "text": "text",
    "background": {
      "solid": "background",
      "gradient": "background_gradient"
    },
    "links": "secondary_button_label",
    "icons": "text",
    "primary_button": "button",
    "on_primary_button": "button_label",
    "primary_button_border": "button",
    "secondary_button": "background",
    "on_secondary_button": "secondary_button_label",
    "secondary_button_border": "secondary_button_label"
  }
}
          `,
        },
        {
          title: "font_picker",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#font_picker",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`font_picker\` outputs a font picker field. \n\n Additional attributes: \n\n - \`default\`: A string in the format \`{font_family}_{weight}\` (required) \n\n When accessing the value of a \`font_picker\` type setting, data is returned as a [font object](https://shopify.dev/themes/architecture/settings/fonts#font-object).`,
          example: `
{
  "type": "font_picker",
  "id": "heading_font",
  "label": "Heading font",
  "default": "helvetica_n4"
}
          `,
        },
        {
          title: "html",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#html",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`html\` outputs a multi-line text field that accepts HTML. \n\n Additional attributes: \n\n - \`placeholder\`: A placeholder value for the input (optional) \n\n When accessing the value of an \`html\` type setting, data is returned as either: \n\n - A string \n\n - An empty object, if nothing has been entered
          `,
          example: `
{
  "type": "html",
  "id": "video_embed",
  "label": "Video embed"
}
          `,
        },
        {
          title: "image_picker",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#image_picker",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`image_picker\` outputs an image picker field. \n\n When accessing the value of an \`image_picker\` type setting, data is returned as either: \n\n - An [image object](https://shopify.dev/docs/api/liquid/objects/image) \n\n - nil, if no image is selected \n\n ## Image focal points \n\n Images selected using an \`image_picker\` setting support focal points. A focal point is a position in an image that the merchant wants to remain in view as the image is cropped and adjusted by the theme.
          `,
          example: `
{
  "type": "image_picker",
  "id": "image_with_text_image",
  "label": "Image"
}
          `,
        },
        {
          title: "inline_richtext",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#inline_richtext",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`inline_richtext\` outputs a single-line rich text editor field. \n\n When accessing the value of an \`inline_richtext\` type setting, data is returned as either: \n\n - A string containing HTML \n\n - An empty object, if nothing has been entered
          `,
          example: `
{
  "type": "inline_richtext",
  "id": "inline",
  "default": "my <i>inline</i> <b>text</b>",
  "label": "Inline rich text"
}
          `,
        },
        {
          title: "link_list",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#link_list",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`link_list\` outputs a menu picker field. \n\n When accessing the value of a \`link_list\` type setting, data is returned as either: \n\n - A [linklist object](https://shopify.dev/docs/api/liquid/objects/linklist) \n\n - nil, if no menu is selected
          `,
          example: `
{
  "type": "link_list",
  "id": "menu",
  "label": "Menu"
}
          `,
        },
        {
          title: "liquid",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#liquid",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`liquid\` outputs a multi-line text field that accepts Liquid code. \n\n Additional attributes: \n\n - \`placeholder\`: A placeholder value for the input (optional) \n\n When accessing the value of a \`liquid\` type setting, data is returned as either: \n\n - A string \n\n - An empty object, if nothing has been entered. \n\n  ## Limitations \n\n Settings of type liquid don't have access to the following liquid objects/tags: \n\n - layout \n\n - content_for_header \n\n - content_for_layout \n\n - content_for_index \n\n - section \n\n - javascript \n\n - stylesheet \n\n - schema \n\n - settings
          `,
          example: `
{
  "type": "liquid",
  "id": "battery_message",
  "label": "Battery message",
  "default": "{% if product.tags contains 'battery' %}This product can only be shipped by ground.{% else %}This product can be shipped by ground or air.{% endif %}"
}
          `,
        },
        {
          title: "metaobject",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#metaobject",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`metaobject\` outputs a metaobject picker field. \n\n Additional required attributes: \n\n - \`type\`: The type of metaobject to select \n\n When accessing the value of a \`metaobject\` type setting, data is returned as either: \n\n - A [metaobject](https://shopify.dev/docs/api/liquid/objects/metaobject) \n\n - nil, if no metaobject is selected
          `,
          example: `
{
  "type": "metaobject",
  "id": "my_material_setting",
  "label": "Material",
  "metaobject_type": "shopify--material"
}
          `,
        },
        {
          title: "metaobject_list",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#metaobject_list",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`metaobject_list\` outputs a metaobject list picker field. \n\n Additional required attributes: \n\n - \`type\`: The type of metaobjects to select \n\n When accessing the value of a \`metaobject_list\` type setting, data is returned as either: \n\n - An array of [metaobjects](https://shopify.dev/docs/api/liquid/objects/metaobject) \n\n - An empty array, if no metaobjects are selected
          `,
          example: `
{
  "type": "metaobject_list",
  "id": "my_material_list_setting",
  "label": "Materials",
  "metaobject_type": "shopify--material",
  "limit": 12
}
          `,
        },
        {
          title: "page",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#page",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`page\` outputs a page picker field. \n\n When accessing the value of a \`page\` type setting, data is returned as either: \n\n - A [page object](https://shopify.dev/docs/api/liquid/objects/page) \n\n - nil, if no page is selected
          `,
          example: `
{
  "type": "page",
  "id": "page",
  "label": "Page"
}
          `,
        },
        {
          title: "product",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#product",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`product\` outputs a product picker field. \n\n When accessing the value of a \`product\` type setting, data is returned as either: \n\n - A [product object](https://shopify.dev/docs/api/liquid/objects/product) \n\n - nil, if no product is selected
          `,
          example: `
{
  "type": "product",
  "id": "product",
  "label": "Product"
}
          `,
        },
        {
          title: "product_list",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#product_list",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`product_list\` outputs a product list picker field. \n\n When accessing the value of a \`product_list\` type setting, data is returned as either: \n\n - An array of [product objects](https://shopify.dev/docs/api/liquid/objects/product) \n\n - An empty array, if no products are selected
          `,
          example: `
{
  "type": "product_list",
  "id": "product_list",
  "label": "Products",
  "limit": 12
}
          `,
        },
        {
          title: "richtext",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#richtext",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`richtext\` outputs a rich text editor field. \n\n When accessing the value of a \`richtext\` type setting, data is returned as either: \n\n - A string containing HTML \n\n - An empty object, if nothing has been entered \n\n ## default \n\n The default attribute isn't required. However, if it's used, then only \`<p>\` or \`<ul>\` tags are supported as top-level elements. \n\n The following HTML tags are also supported inside the parent \`<p>\` tag: \n\n - \`<p>\` \n\n - \`<br>\` \n\n - \`<strong>\` \n\n - \`<b>\` \n\n - \`<em>\` \n\n - \`<i>\` \n\n - \`<u>\` \n\n - \`<span>\` \n\n - \`<a>\` \n\n  ## ⚠️ Caution \n\n Failing to wrap the default content in \`<p>\` or \`<ul>\` tags will result in an error.
          `,
          example: `
{
  "type": "richtext",
  "id": "paragraph",
  "label": "Paragraph"
}
          `,
        },
        {
          title: "text_alignment",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#text_alignment",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`text_alignment\` outputs a text alignment control. \n\n When accessing the value of a \`text_alignment\` type setting, data is returned as a string with one of the following values: \n\n - \`left\` \n\n - \`center\` \n\n - \`right\` \n\n If \`default\` is unspecified, then \`left\` is selected by default.
          `,
          example: `
{
   "type": "text_alignment",
   "id": "alignment",
   "label": "Text alignment",
   "default": "center"
}
          `,
        },
        {
          title: "url",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#url",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`url\` outputs a URL picker field. \n\n When accessing the value of a \`url\` type setting, data is returned as either: \n\n - A string \n\n - nil, if no URL is entered \n\n ## url \n\n A setting of type \`url\` outputs a URL entry field where you can manually enter external URLs and relative paths. It also has a picker that's automatically populated with the following available resources for the shop: \n\n - Articles \n\n - Blogs \n\n - Collections \n\n - Pages \n\n - Products \n\n You can use this setting type to capture a URL selection, such as the URL to use for a slideshow button link.
          `,
          example: `
{
  "type": "url",
  "id": "button_link",
  "label": "Button link"
}
          `,
        },
        {
          title: "video",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#video",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`video\` outputs a video picker field. \n\n When accessing the value of a \`video\` type setting, data is returned as either: \n\n - A [video object](https://shopify.dev/docs/api/liquid/objects/video) \n\n - nil, if no video is selected \n\n ## Note \n\n Only videos uploaded through the Shopify admin are supported.
          `,
          example: `
{
  "type": "video",
  "id": "video",
  "label": "A Shopify-hosted video"
}
          `,
        },
        {
          title: "video_url",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#video_url",
          keyword: ["settings", "specialized input"],
          category: "Settings",
          subcategory: "Specialized Input Settings",
          description: `A setting of type \`video_url\` outputs a video URL field. \n\n When accessing the value of a \`video_url\` type setting, data is returned as either: \n\n - A string \n\n - nil, if no URL is entered \n\n ## Note \n\n Only YouTube and Vimeo URLs are supported.
          `,
          example: `
{
  "type": "video_url",
  "id": "product_description_video",
  "label": "Product description video",
  "accept": [
    "youtube",
    "vimeo"
  ]
}
          `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Resources",
      items: [
        {
          title: "Cart API",
          url: "https://shopify.dev/docs/api/ajax/reference/cart",
          keyword: ["cart", "api"],
          category: "Resources",
          subcategory: "API",
          description:
            "The Cart API is a set of endpoints that allow you to interact with the cart in a Shopify theme.",
        },
        {
          title: "Fonts",
          url: "https://shopify.dev/docs/storefronts/themes/architecture/settings/fonts",
          keyword: ["fonts"],
          category: "Resources",
          subcategory: "Assets",
          description: "Learn about the fonts of Shopify themes.",
        },
        {
          title: "Liquid",
          url: "https://shopify.dev/docs/api/liquid",
          keyword: ["liquid"],
          category: "Resources",
          subcategory: "Languages",
          description:
            "The Liquid language is used to build Shopify themes. \n\n Also see [Search Shopify Liquid Extension](https://www.raycast.com/maximedaraize/search-shopify-liquid-documentation) for a quick reference of Shopify Liquid.",
        },
        {
          title: "Liquid Cheat Sheet",
          url: "https://www.shopify.com/partners/shopify-cheat-sheet",
          keyword: ["liquid", "cheat sheet"],
          category: "Resources",
          subcategory: "Tools",
          description: "The Shopify Cheat Sheet is a resource for building Shopify Themes with Liquid.",
        },
        {
          title: "Predictive Search API",
          url: "https://shopify.dev/docs/api/ajax/reference/predictive-search",
          keyword: ["predictive", "search", "api"],
          category: "Resources",
          subcategory: "API",
          description:
            "The Predictive Search API is a set of endpoints that allow you to interact with predictive search in a Shopify theme.",
        },
        {
          title: "Product Recommendations API",
          url: "https://shopify.dev/docs/api/ajax/reference/product-recommendations",
          keyword: ["product", "recommendations", "api"],
          category: "Resources",
          subcategory: "API",
          description:
            "The Product Recommendations API is a set of endpoints that allow you to interact with product recommendations in a Shopify theme.",
        },
        {
          title: "Section Rendering API",
          url: "https://shopify.dev/docs/api/ajax/section-rendering",
          keyword: ["section", "rendering", "api"],
          category: "Resources",
          subcategory: "API",
          description:
            "The Section Rendering API is a set of endpoints that allow you to interact with sections in a Shopify theme.",
        },
        {
          title: "Shopify Dev Forums",
          url: "https://community.shopify.dev/",
          keyword: ["shopify", "dev", "forums"],
          category: "Resources",
          subcategory: "Forums",
          description:
            "The Shopify Dev Forums is a community for Shopify developers to ask questions, share ideas, and get help from other developers.",
        },
        {
          title: "Shopify Liquid Code Examples",
          url: "https://shopify.github.io/liquid-code-examples/",
          keyword: ["liquid", "code", "examples"],
          category: "Resources",
          subcategory: "Tutorials",
          description:
            "The Shopify Liquid Code Examples is a collection of code examples for Shopify themes using Liquid.",
        },
        {
          title: "Shopify UI Elements Generator",
          url: "https://ui-elements-generator.myshopify.com/pages/cart-attribute",
          keyword: ["ui", "elements", "generator"],
          category: "Resources",
          subcategory: "Tools",
          description: "The Shopify UI Elements Generator is a tool for generating UI elements for Shopify themes.",
        },
      ],
    },
  },
];
