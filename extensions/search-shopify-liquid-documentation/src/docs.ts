import { DocType } from "./types/types";

export const docList: DocType[] = [
  {
    section: {
      sectionTitle: "Basics",
      items: [
        {
          title: "handles",
          url: "https://shopify.dev/docs/api/liquid/basics#handles",
          keyword: ["basics"],
          category: "Basics",
          description: `Objects that represent store resources, such as products, collections, articles, and blogs, have handles for identifying an individual resource. The handle is used to build the URL for the resource, or to return properties for the resource \n\n Other objects like \`linklists\`, \`links\`, and \`settings\` also have handles.
            
    {{ product.title | handle }}
            
            `,
        },
        {
          title: "operators",
          url: "https://shopify.dev/docs/api/liquid/basics#operators",
          keyword: ["basics"],
          category: "Basics",
          description: `Liquid supports basic logical and comparison operators for use with [conditional tags](https://shopify.dev/docs/api/liquid/tags/conditional-tags). \n\n 

| Operator | Function                                 |
|----------|------------------------------------------|
| ==       | equals                                   |
| !=       | does not equal                           |
| >        | greater than                             |
| <        | less than                                |
| >=       | greater than or equal to                 |
| <=       | less than or equal to                    |
| or       | Condition A or Condition B               |
| and      | Condition A and Condition B              |
| contains | Checks for strings in strings or arrrays |

`,
        },
        {
          title: "types",
          url: "https://shopify.dev/docs/api/liquid/basics#types",
          keyword: ["basics"],
          category: "Basics",
          description:
            "Liquid supports the following types of data: `String`, `Number`, `Boolean`, `Nil`, `Array`, and `Empty`.",
        },
        {
          title: "thruty and falsy",
          url: "https://shopify.dev/docs/api/liquid/basics#truthy-and-falsy",
          keyword: ["basics"],
          category: "Basics",
          description: `All data types must return either \`true\` or \`false\`. Those which return \`true\` by default are called truthy. Those that return \`false\` by default are called falsy.
          
| Value        | Truthy | Falsy |
|--------------|--------|-------|
| true         | ✔︎     |       |
| false        |        | ✔︎    |
| nil          |        | ✔︎    |
| empty string | ✔︎     |       |
| 0            | ✔︎     |       |
| integer      | ✔︎     |       |
| float        | ✔︎     |       |
| array        | ✔︎     |       |
| empty object | ✔︎     |       |


    {% if settings.featured_potions_title != blank -%}
      {{ settings.featured_potions_title }}
    {%- else -%}
      No value for this setting has been selected.
    {%- endif %}
    {% unless pages.recipes == empty -%}
      {{ pages.recipes.content }}
    {%- else -%}
      No page with this handle exists.
    {%- endunless %}
          
          `,
        },
        {
          title: "whitespace control",
          keyword: ["basics"],
          category: "Basics",
          url: "https://shopify.dev/docs/api/liquid/basics#whitespace-control",
          description: `Even if it doesn't output text, any line of Liquid outputs a line in your rendered content. By including hyphens in your Liquid tag, you can strip any whitespace that your Liquid generates when rendered. \n\n If you want to remove whitespace on only one side of the Liquid tag, then you can include the hyphen on either the opening or closing tag.
          
          
    {%- if collection.products.size > 0 -%}
    The '{{ collection.title }}' collection contains the following types of products:

    {% for type in collection.all_types -%}
      {% unless type == blank -%}
        - {{ type }}
      {%- endunless -%}
    {%- endfor %}
    {%- endif -%}
          `,
        },
      ],
    },
  },

  {
    section: {
      sectionTitle: "Tags: Conditional",
      items: [
        {
          title: "if",
          url: "https://shopify.dev/docs/api/liquid/tags/if",
          keyword: ["tags", "conditional"],
          category: "Tags",
          subcategory: "Conditional",
          description: `Renders an expression if a specific condition is \`true\`.
          
    {% if condition %}
      expression
    {% endif %}     
          
          `,
        },
        {
          title: "else",
          url: "https://shopify.dev/docs/api/liquid/tags/else",
          keyword: ["tags", "conditional"],
          category: "Tags",
          subcategory: "Conditional",
          description: `Allows you to specify a default expression to execute when no other condition is met. \n\n You can use the \`else\` tag with the following tags:  \n\n - \`case\`  \n\n - \`if\`  \n\n - \`unless\` \n\n

        
    \`\`\`json      
    {% if product.available %}
      This product is available!
    {% else %}
      This product is sold out!
    {% endif %}
    \`\`\`
          
          `,
        },
        {
          title: "unless",
          url: "https://shopify.dev/docs/api/liquid/tags/unless",
          keyword: ["tags", "conditional"],
          category: "Tags",
          subcategory: "Conditional",
          description: `Renders an expression unless a specific condition is \`true\`. \n\n Similar to the \`if\` tag, you can use \`elsif\` to add more conditions to an \`unless\` tag.
          
    {% unless condition %}
      expression
    {% endunless %}
          
          `,
        },
        {
          title: "case",
          url: "https://shopify.dev/docs/api/liquid/tags/case",
          keyword: ["tags", "conditional"],
          category: "Tags",
          subcategory: "Conditional",
          description: `Renders a specific expression depending on the value of a specific variable.
          
    {% case product.type %}
      {% when 'Health' %}
        This is a health potion.
      {% when 'Love' %}
        This is a love potion.
      {% else %}
        This is a potion.
    {% endcase %}
          
          
          `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Tags: HTML",
      items: [
        {
          title: "form",
          url: "https://shopify.dev/docs/api/liquid/tags/form",
          keyword: ["tags", "html"],
          category: "Tags",
          subcategory: "HTML",
          description: `Generates an HTML \`<form>\` tag, including any required \`<input>\` tags to submit the form to a specific endpoint. \n\n Because there are many different form types available in Shopify themes, the form tag requires a type. Depending on the form type, an additional parameter might be required, like:  \n\n - [activate_customer_password](https://shopify.dev/docs/api/liquid/tags/form#form-activate_customer_password) \n\n - [cart](https://shopify.dev/docs/api/liquid/tags/form#form-cart)  \n\n - [contact](https://shopify.dev/docs/api/liquid/tags/form#form-contact) \n\n - [create_customer](https://shopify.dev/docs/api/liquid/tags/form#form-create_customer) \n\n - [currency](https://shopify.dev/docs/api/liquid/tags/form#form-currency) \n\n - [customer](https://shopify.dev/docs/api/liquid/tags/form#form-customer) \n\n - [customer_address](https://shopify.dev/docs/api/liquid/tags/form#form-customer_address) \n\n - [customer_login](https://shopify.dev/docs/api/liquid/tags/form#form-customer_login) \n\n - [guest_login](https://shopify.dev/docs/api/liquid/tags/form#form-guest_login) \n\n - [localization](https://shopify.dev/docs/api/liquid/tags/form#form-localization) \n\n - [new_comment](https://shopify.dev/docs/api/liquid/tags/form#form-new_comment) \n\n - [product](https://shopify.dev/docs/api/liquid/tags/form#form-product) \n\n - [recover_customer_password](https://shopify.dev/docs/api/liquid/tags/form#form-recover_customer_password) \n\n - [reset_customer_password](https://shopify.dev/docs/api/liquid/tags/form#form-reset_customer_password) \n\n - [storefront_password](https://shopify.dev/docs/api/liquid/tags/form#form-storefront_password)
          
  \`\`\`json       
    {% form 'form_type' %}
      content
    {% endform %}
  \`\`\`       
          `,
        },
        {
          title: "style",
          url: "https://shopify.dev/docs/api/liquid/tags/style",
          keyword: ["tags", "html"],
          category: "Tags",
          subcategory: "HTML",
          description: `Generates an HTML \`<style>\` tag with an attribute of data-shopify. \n\n If you reference \`color settings\` inside \`style\` tags, then the associated CSS rules will update as the setting is changed in the theme editor, without a page refresh.
          
    {% style %}
      .h1 {
        color: {{ settings.colors_accent_1 }};
      }
    {% endstyle %}
          
          `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Tags: Iteration",
      items: [
        {
          title: "for",
          url: "https://shopify.dev/docs/api/liquid/tags/for",
          keyword: ["tags", "iteration"],
          category: "Tags",
          subcategory: "Iteration",
          description: `Renders an expression for every item in an array. You can do a maximum of 50 iterations with a \`for\` loop. If you need to iterate over more than 50 items, then use the [paginate tag](https://shopify.dev/docs/api/liquid/tags/paginate) to split the items over multiple pages. 

    {% for product in collection.products -%}
      {{ product.title }}
    {%- endfor %}

        `,
        },
        {
          title: "else",
          url: "https://shopify.dev/docs/api/liquid/tags/else",
          keyword: ["tags", "iteration"],
          category: "Tags",
          subcategory: "Iteration",
          description: `Allows you to specify a default expression to execute when a [for loop](https://shopify.dev/docs/api/liquid/tags/for) has zero length. 

    {% for variable in array %}
      first_expression
    {% else %}
      second_expression
    {% endfor %}

        `,
        },
        {
          title: "break",
          url: "https://shopify.dev/docs/api/liquid/tags/break",
          keyword: ["tags", "iteration"],
          category: "Tags",
          subcategory: "Iteration",
          description: `Stops a [for loop](https://shopify.dev/docs/api/liquid/tags/for) from iterating. 

    {% for i in (1..5) -%}
      {%- if i == 4 -%}
        {% break %}
      {%- else -%}
        {{ i }}
      {%- endif -%}
    {%- endfor %}
        
        `,
        },
        {
          title: "continue",
          url: "https://shopify.dev/docs/api/liquid/tags/continue",
          keyword: ["tags", "iteration"],
          category: "Tags",
          subcategory: "Iteration",
          description: `Causes a [for loop](https://shopify.dev/docs/api/liquid/tags/for) to skip to the next iteration.

    {% for i in (1..5) -%}
      {%- if i == 4 -%}
        {% continue %}
      {%- else -%}
        {{ i }}
      {%- endif -%}
    {%- endfor %}
        
        `,
        },
        {
          title: "cycle",
          url: "https://shopify.dev/docs/api/liquid/tags/cycle",
          keyword: ["tags", "iteration"],
          category: "Tags",
          subcategory: "Iteration",
          description: `Loops through a group of strings and outputs them one at a time for each iteration of a [for loop](https://shopify.dev/docs/api/liquid/tags/for). The \`cycle\` tag must be used inside a \`for\` loop.

    {% for i in (1..4) -%}
      {% cycle 'one', 'two', 'three' %}
    {%- endfor %}
        
        `,
        },
        {
          title: "tablerow",
          url: "https://shopify.dev/docs/api/liquid/tags/tablerow",
          keyword: ["tags", "iteration"],
          category: "Tags",
          subcategory: "Iteration",
          description: `Generates HTML table rows for every item in an array. The tablerow tag must be wrapped in HTML \`<table>\` and \`</table>\` tags.

    {% tablerow variable in array %}
      expression
    {% endtablerow %}
        
        `,
        },
        {
          title: "paginate",
          url: "https://shopify.dev/docs/api/liquid/tags/paginate",
          keyword: ["tags", "iteration"],
          category: "Tags",
          subcategory: "Iteration",
          description: `Splits an array's items across multiple pages. Because [for loops](https://shopify.dev/docs/api/liquid/tags/for) are limited to 50 iterations per page, you need to use the \`paginate\` tag to iterate over an array that has more than 50 items. The following arrays can be paginated: \n\n - [all_products](https://shopify.dev/docs/api/liquid/objects/all_products) \n\n - [article.comments](https://shopify.dev/docs/api/liquid/objects/article#article-comments) \n\n - [blog.articles](https://shopify.dev/docs/api/liquid/objects/blog#blog-articles) \n\n - [collections](https://shopify.dev/docs/api/liquid/objects/collections) \n\n - [collection.products](https://shopify.dev/docs/api/liquid/objects/collection#collection-products) \n\n - [customer.addresses](https://shopify.dev/docs/api/liquid/objects/customer#customer-addresses) \n\n - [customer.orders](https://shopify.dev/docs/api/liquid/objects/customer#customer-orders) \n\n - [pages](https://shopify.dev/docs/api/liquid/objects/pages) \n\n - [search.results](https://shopify.dev/docs/api/liquid/objects/search#search-results) \n\n - [collection_list settings](https://shopify.dev/themes/architecture/settings/input-settings#collection_list) \n\n - [product_list settings](https://shopify.dev/themes/architecture/settings/input-settings#product_list \n\n Within the \`paginate\` tag, you have access to the \`paginate object\`. You can use this object, or the \`default_pagination\` filter, to build page navigation. \n\n Within the paginate tag, you have access to the [paginate object](https://shopify.dev/docs/api/liquid/objects/paginate). You can use this object, or the [default_pagination filter](https://shopify.dev/docs/api/liquid/objects/paginate), to build page navigation.

    {% paginate array by page_size %}
      {% for item in array %}
        forloop_content
      {% endfor %}
    {% endpaginate %}
        
        `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Tags: Syntax",
      items: [
        {
          title: "comment",
          url: "https://shopify.dev/docs/api/liquid/tags/comment",
          keyword: ["tags", "syntax"],
          category: "Tags",
          subcategory: "Syntax",
          description: `Prevents an expression from being rendered or output. Any text inside \`comment\` tags won't be output, and any Liquid code will be parsed, but not executed. 

    {% comment %}
      content
    {% endcomment %}

        `,
        },
        {
          title: "echo",
          url: "https://shopify.dev/docs/api/liquid/tags/echo",
          keyword: ["tags", "syntax"],
          category: "Tags",
          subcategory: "Syntax",
          description: `Outputs an expression. Using the \`echo\` tag is the same as wrapping an expression in curly brackets (\`{{ and }}\`). However, unlike the curly bracket method, you can use the echo tag inside [liquid tags](https://shopify.dev/docs/api/liquid/tags/liquid). 

    {% echo product.title %}

    {% liquid
      echo product.price | money
    %}

        `,
        },
        {
          title: "liquid",
          url: "https://shopify.dev/docs/api/liquid/tags/liquid",
          keyword: ["tags", "syntax"],
          category: "Tags",
          subcategory: "Syntax",
          description: `Allows you to have a block of Liquid without delimeters on each tag. Because the tags don't have delimeters, each tag needs to be on its own line. 

    {% liquid
      # Show a message that's customized to the product type

      assign product_type = product.type | downcase
      assign message = ''

      case product_type
        when 'health'
          assign message = 'This is a health potion!'
        when 'love'
          assign message = 'This is a love potion!'
        else
          assign message = 'This is a potion!'
      endcase

      echo message
    %}

        `,
        },
        {
          title: "raw",
          url: "https://shopify.dev/docs/api/liquid/tags/raw",
          keyword: ["tags", "syntax"],
          category: "Tags",
          subcategory: "Syntax",
          description: `Outputs any Liquid code as text instead of rendering it.

    {% raw %}
      {{ 2 | plus: 2 }} equals 4.
    {% endraw %}

        `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Tags: Theme",
      items: [
        {
          title: "content_for",
          url: "https://shopify.dev/docs/api/liquid/tags/content_for",
          keyword: ["tags", "theme"],
          category: "Tags",
          subcategory: "Theme",
          description: `Creates a surface for rendering a block or blocks. \n\n The content_for tag requires a type to indicate whether it will render a single static block or a number of theme blocks defined in the JSON templates or section groups. \n\n Renders block elements within sections or other blocks as configured in the JSON template or section groups. See [theme blocks](https://shopify.dev/themes/architecture/blocks/theme-blocks) to see how to create theme blocks that can be used this way.

    {% 
      content_for "block", 
      type: "button", 
      id: "static-block-1" 
    %}

        `,
        },
        {
          title: "include",
          url: "https://shopify.dev/docs/api/liquid/tags/include",
          isDeprecated: true,
          keyword: ["tags", "theme", "deprecated"],
          category: "Tags",
          subcategory: "Theme",
          description: `Renders a [snippet](https://shopify.dev/themes/architecture#snippets). Inside the snippet, you can access and alter variables that are [created](https://shopify.dev/docs/api/liquid/tags/variable-tags) outside of the snippet.\n\n  \n\n ## ⚠️ Deprecated \n\n Deprecated because the way that variables are handled reduces performance and makes code harder to both read and maintain.\n\n The \`include\` tag has been replaced by \`render\`.

    {% include 'filename' %}

        `,
        },
        {
          title: "javascript",
          url: "https://shopify.dev/docs/api/liquid/tags/javascript",
          keyword: ["tags", "theme"],
          category: "Tags",
          subcategory: "Theme",
          description: `JavaScript code included in a [section](https://shopify.dev/themes/architecture/sections) file. \n\n You need to use these tags only if your section or app block is meant to be installed on multiple themes or stores. Otherwise, you should include the JavaScript that your section needs in your theme's [assets](https://shopify.dev/themes/architecture#assets) directory. Each section or app block can have only one \`{% javascript %}\` tag. \n\n Liquid isn't rendered inside of \`{% javascript %}\` tags. \n\n To learn more about how section-specific JavaScript is loaded and run, refer to the documentation for [sections](https://shopify.dev/themes/architecture/sections/section-assets#javascript). \n\n ## ⚠️ Caution \n\n Including Liquid code can cause syntax errors.

    {% javascript %}
      javascript_code
    {% endjavascript %}

        `,
        },
        {
          title: "layout",
          url: "https://shopify.dev/docs/api/liquid/tags/layout",
          keyword: ["tags", "theme"],
          category: "Tags",
          subcategory: "Theme",
          description: `Specify which [layout](https://shopify.dev/themes/architecture/layouts) to use.

    {% layout 'full-width' %}
    {% layout none %}

        `,
        },
        {
          title: "render",
          url: "https://shopify.dev/docs/api/liquid/tags/render",
          keyword: ["tags", "theme"],
          category: "Tags",
          subcategory: "Theme",
          description: `Renders a [snippet](https://shopify.dev/themes/architecture#snippets) or [app block](https://shopify.dev/themes/architecture/sections/section-schema#render-app-blocks). \n\n Inside snippets and app blocks, you can't directly access variables that are [created](https://shopify.dev/docs/api/liquid/tags/variable-tags) outside of the snippet or app block. However, you can [specify variables as parameters](https://shopify.dev/docs/api/liquid/tags/render#render-passing-variables-to-a-snippet) to pass outside variables to snippets. \n\n While you can't directly access created variables, you can access global objects, as well as any objects that are directly accessible outside the snippet or app block. For example, a snippet or app block inside the [product template](https://shopify.dev/themes/architecture/templates/product) can access the [product object](https://shopify.dev/docs/api/liquid/objects/product), and a snippet or app block inside a [section](https://shopify.dev/themes/architecture/sections) can access the [section object](https://shopify.dev/docs/api/liquid/objects/section). \n\n Outside a snippet or app block, you can't access variables created inside the snippet or app block.

    {% render 'filename' %}

        `,
        },
        {
          title: "section",
          url: "https://shopify.dev/docs/api/liquid/tags/section",
          keyword: ["tags", "theme"],
          category: "Tags",
          subcategory: "Theme",
          description: `Renders a [section](https://shopify.dev/themes/architecture/sections). \n\n Rendering a \`section\` with the section tag renders a section statically. To learn more about sections and how to use them in your theme, refer to [Render a section](https://shopify.dev/themes/architecture/sections#render-a-section).


    {% section 'header' %}

        `,
        },
        {
          title: "sections",
          url: "https://shopify.dev/docs/api/liquid/tags/sections",
          keyword: ["tags", "theme"],
          category: "Tags",
          subcategory: "Theme",
          description: `Renders a [section group](https://shopify.dev/themes/architecture/section-groups). \n\n Use this tag to render section groups as part of the theme's [layout](https://shopify.dev/themes/architecture/layouts) content. Place the \`sections\` tag where you want to render it in the layout. \n\n To learn more about section groups and how to use them in your theme, refer to [Section groups](https://shopify.dev/themes/architecture/section-groups#usage).


    {% sections 'name' %}

        `,
        },
        {
          title: "stylesheet",
          url: "https://shopify.dev/docs/api/liquid/tags/stylesheet",
          keyword: ["tags", "theme"],
          category: "Tags",
          subcategory: "Theme",
          description: `CSS styles included in a [section](https://shopify.dev/themes/architecture/sections) file. \n\n You need to use these tags only if your section or app block is meant to be installed on multiple themes or stores. Otherwise, you should include the CSS styles that your section needs in your theme's [assets](https://shopify.dev/themes/architecture#assets) directory. Each section or app block can have only one \`{% stylesheet %}\` tag. \n\n To learn more about how section-specific CSS is loaded and run, refer to the documentation for \`section\`s \n\n ## ⚠️ Caution \n\n Liquid isn't rendered inside of \`{% stylesheet %}\` tags. Including Liquid code can cause syntax errors..


    {% stylesheet %}
      css_styles
    {% endstylesheet %}

        `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Tags: Variable",
      items: [
        {
          title: "assign",
          url: "https://shopify.dev/docs/api/liquid/tags/assign",
          keyword: ["tags", "variable"],
          category: "Tags",
          subcategory: "Variable",
          description: `Creates a new variable. \n\n You can create variables of any [basic type](https://shopify.dev/docs/api/liquid/basics#types), [object](https://shopify.dev/docs/api/liquid/objects), or object property.

    {%- assign product_title = product.title | upcase -%}

    {{ product_title }}

        `,
        },
        {
          title: "capture",
          url: "https://shopify.dev/docs/api/liquid/tags/capture",
          keyword: ["tags", "variable"],
          category: "Tags",
          subcategory: "Variable",
          description: `Creates a new variable with a string value. \n\n You can create complex strings with Liquid logic and variables.

    {%- assign up_title = product.title | upcase -%}
    {%- assign down_title = product.title | downcase -%}
    {%- assign show_up_title = true -%}

    {%- capture title -%}
      {% if show_up_title -%}
        Upcase title: {{ up_title }}
      {%- else -%}
        Downcase title: {{ down_title }}
      {%- endif %}
    {%- endcapture %}

    {{ title }}

        `,
        },
        {
          title: "decrement",
          url: "https://shopify.dev/docs/api/liquid/tags/decrement",
          keyword: ["tags", "variable"],
          category: "Tags",
          subcategory: "Variable",
          description: `Creates a new variable, with a default value of -1, that's decreased by 1 with each subsequent call. \n\n Variables that are declared with \`decrement\` are unique to the [layout](https://shopify.dev/themes/architecture/layouts), [template](https://shopify.dev/themes/architecture/templates), or [section](https://shopify.dev/themes/architecture/sections) file that they're created in. However, the variable is shared across [snippets](https://shopify.dev/themes/architecture#snippets) included in the file. \n\n Similarly, variables that are created with \`decrement\` are independent from those created with [assign](https://shopify.dev/docs/api/liquid/tags/assign) and [capture](https://shopify.dev/docs/api/liquid/tags/capture). However, decrement and [increment](https://shopify.dev/docs/api/liquid/tags/increment) share variables.

    {% decrement variable_name %}

        `,
        },
        {
          title: "increment",
          url: "https://shopify.dev/docs/api/liquid/tags/increment",
          keyword: ["tags", "variable"],
          category: "Tags",
          subcategory: "Variable",
          description: `Creates a new variable, with a default value of 0, that's increased by 1 with each subsequent call. \n\n VVariables that are declared with \`increment\` are unique to the [layout](https://shopify.dev/themes/architecture/layouts), [template](https://shopify.dev/themes/architecture/templates), or [section](https://shopify.dev/themes/architecture/sections) file that they're created in. However, the variable is shared across [snippets](https://shopify.dev/themes/architecture#snippets) included in the file. \n\n Similarly, variables that are created with \`increment\` are independent from those created with [assign](https://shopify.dev/docs/api/liquid/tags/assign) and [capture](https://shopify.dev/docs/api/liquid/tags/capture). However, \`increment\` and [decrement](https://shopify.dev/docs/api/liquid/tags/decrement) share variables.

    {% increment variable_name %}

        `,
        },
      ],
    },
  },

  {
    section: {
      sectionTitle: "Filters: Array",
      items: [
        {
          title: "compact",
          url: "https://shopify.dev/docs/api/liquid/filters/compact",
          keyword: ["filters", "array"],
          category: "Filters",
          subcategory: "Array",
          description: `Removes any \`nil\` items from an array.

    {%- assign original_prices = collection.products | map: 'compare_at_price' -%}

    Original prices:

    {% for price in original_prices -%}
      - {{ price }}
    {%- endfor %}

    {%- assign compacted_original_prices = original_prices | compact -%}

    Original prices - compacted:

    {% for price in compacted_original_prices -%}
      - {{ price }}
    {%- endfor %}

        `,
        },
        {
          title: "concat",
          url: "https://shopify.dev/docs/api/liquid/filters/concat",
          keyword: ["filters", "array"],
          category: "Filters",
          subcategory: "Array",
          description: `Concatenates (combines) two arrays.

    {%- assign types_and_vendors = collection.all_types | concat: collection.all_vendors -%}

    Types and vendors:

    {% for item in types_and_vendors -%}
      {%- if item != blank -%}
        - {{ item }}
      {%- endif -%}
    {%- endfor %}

        `,
        },
        {
          title: "first",
          url: "https://shopify.dev/docs/api/liquid/filters/first",
          keyword: ["filters", "array"],
          category: "Filters",
          subcategory: "Array",
          description: `Returns the first item in an array.

    {%- assign first_product = collection.products | first -%}

    {{ first_product.title }}

        `,
        },
        {
          title: "join",
          url: "https://shopify.dev/docs/api/liquid/filters/join",
          keyword: ["filters", "array"],
          category: "Filters",
          subcategory: "Array",
          description: `Combines all of the items in an array into a single string, separated by a space.

    {{ collection.all_tags | join }}

        `,
        },
        {
          title: "last",
          url: "https://shopify.dev/docs/api/liquid/filters/last",
          keyword: ["filters", "array"],
          category: "Filters",
          subcategory: "Array",
          description: `Returns the last item in an array.

    {%- assign last_product = collection.products | last -%}

    {{ last_product.title }}

        `,
        },
        {
          title: "map",
          url: "https://shopify.dev/docs/api/liquid/filters/map",
          keyword: ["filters", "array"],
          category: "Filters",
          subcategory: "Array",
          description: `Creates an array of values from a specific property of the items in an array.

    {%- assign product_titles = collection.products | map: 'title' -%}

    {{ product_titles | join: ', ' }}

        `,
        },
        {
          title: "reverse",
          url: "https://shopify.dev/docs/api/liquid/filters/reverse",
          keyword: ["filters", "array"],
          category: "Filters",
          subcategory: "Array",
          description: `Reverses the order of the items in an array.

    {{ collection.products | reverse | map: 'title' | join: ', ' }}

        `,
        },
        {
          title: "size",
          url: "https://shopify.dev/docs/api/liquid/filters/size",
          keyword: ["filters", "array"],
          category: "Filters",
          subcategory: "Array",
          description: `Returns the size of a string or array. \n\n The size of a string is the number of characters that the string includes. The size of an array is the number of items in the array.

    {{ collection.title | size }}
    {{ collection.products | size }}

        `,
        },
        {
          title: "sort",
          url: "https://shopify.dev/docs/api/liquid/filters/sort",
          keyword: ["filters", "array"],
          category: "Filters",
          subcategory: "Array",
          description: `Sorts the items in an array in case-sensitive alphabetical, or numerical, order.

    {% assign tags = collection.all_tags | sort %}

    {% for tag in tags -%}
      {{ tag }}
    {%- endfor %}

        `,
        },
        {
          title: "sort_natural",
          url: "https://shopify.dev/docs/api/liquid/filters/sort_natural",
          keyword: ["filters", "array"],
          category: "Filters",
          subcategory: "Array",
          isDeprecated: true,
          description: `Sorts the items in an array in case-insensitive alphabetical order.

    {% assign tags = collection.all_tags | sort_natural %}

    {% for tag in tags -%}
      {{ tag }}
    {%- endfor %}

        `,
        },
        {
          title: "sum",
          url: "https://shopify.dev/docs/api/liquid/filters/sum",
          keyword: ["filters", "array"],
          category: "Filters",
          subcategory: "Array",
          description: `Returns the sum of all elements in an array.

    {% assign fibonacci = '0, 1, 1, 2, 3, 5' | split: ', ' %}

    {{ fibonacci | sum }}

        `,
        },
        {
          title: "uniq",
          url: "https://shopify.dev/docs/api/liquid/filters/uniq",
          keyword: ["filters", "array"],
          category: "Filters",
          subcategory: "Array",
          description: `Removes any duplicate items in an array.

    {% assign potion_array = 'invisibility, health, love, health, invisibility' | split: ', ' %}

    {{ potion_array | uniq | join: ', ' }}

        `,
        },
        {
          title: "where",
          url: "https://shopify.dev/docs/api/liquid/filters/where",
          keyword: ["filters", "array"],
          category: "Filters",
          subcategory: "Array",
          description: `Filters an array to include only items with a specific property value. This requires you to provide both the property name and the associated value.

    {% assign polina_products = collection.products | where: 'vendor', "Polina's Potent Potions" %}

    Products from Polina's Potent Potions:

    {% for product in polina_products -%}
      - {{ product.title }}
    {%- endfor %}

        `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Filters: Cart",
      items: [
        {
          title: "item_count_for_variant",
          url: "https://shopify.dev/docs/api/liquid/filters/item_count_for_variant",
          keyword: ["filters", "cart"],
          category: "Filters",
          subcategory: "Cart",
          description: `Returns the total item count for a specified variant in the cart.

    {{ cart | item_count_for_variant: 39888235757633 }}

        `,
        },
        {
          title: "line_items_for",
          url: "https://shopify.dev/docs/api/liquid/filters/line_items_for",
          keyword: ["filters", "cart"],
          category: "Filters",
          subcategory: "Cart",
          description: `Returns the total item count for a specified variant in the cart.

    {% assign product = all_products['bloodroot-whole'] %}
    {% assign line_items = cart | line_items_for: product %}

    Total cart quantity for product: {{ line_items | sum: 'quantity' }}

        `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Filters: Collection",
      items: [
        {
          title: "hightlight_active_tag",
          url: "https://shopify.dev/docs/api/liquid/filters/hightlight_active_tag",
          keyword: ["filters", "collection"],
          category: "Filters",
          subcategory: "Collection",
          description: `Wraps a given tag in an HTML \`<span>\` tag, with a \`class\` attribute of \`active\`, if the tag is currently active. Only applies to collection tags.

    {% for tag in collection.all_tags %}
      {{- tag | highlight_active_tag | link_to_tag: tag }}
    {% endfor %}

        `,
        },
        {
          title: "link_to_type",
          url: "https://shopify.dev/docs/api/liquid/filters/link_to_type",
          keyword: ["filters", "collection"],
          category: "Filters",
          subcategory: "Collection",
          description: `Generates an HTML \`<a>\` tag with an \`href\` attribute linking to a collection page that lists all products of the given product type.

    {{ 'Health' | link_to_type }}

        `,
        },
        {
          title: "link_to_vendor",
          url: "https://shopify.dev/docs/api/liquid/filters/link_to_vendor",
          keyword: ["filters", "collection"],
          category: "Filters",
          subcategory: "Collection",
          description: `Generates an HTML \`<a>\` tag with an \`href\` attribute linking to a collection page that lists all products of the given product vendor.

    {{ "Polina's Potent Potions" | link_to_vendor }}

        `,
        },
        {
          title: "sort_by",
          url: "https://shopify.dev/docs/api/liquid/filters/sort_by",
          keyword: ["filters", "collection"],
          category: "Filters",
          subcategory: "Collection",
          description: `Generates a collection URL with the provided \`sort_by\` parameter appended. This filter must be applied to a collection URL. \n\n Accepts the following values: \n\n - \`manual\` \n\n - \`best-selling\` \n\n - \`title-ascending\` \n\n - \`title-descending\` \n\n - \`price-ascending\` \n\n - \`price-descending\` \n\n - \`created-ascending\` \n\n - \`created-descending\`


    \`\`\`json
    {{ "Polina's Potent Potions" | link_to_vendor }}
    \`\`\`
        `,
        },
        {
          title: "url_for_type",
          url: "https://shopify.dev/docs/api/liquid/filters/url_for_type",
          keyword: ["filters", "collection"],
          category: "Filters",
          subcategory: "Collection",
          description: `Generates a URL for a collection page that lists all products of the given product type.

    {{ 'health' | url_for_type }}
        `,
        },
        {
          title: "url_for_vendor",
          url: "https://shopify.dev/docs/api/liquid/filters/url_for_type",
          keyword: ["filters", "collection"],
          category: "Filters",
          subcategory: "Collection",
          description: `Generates a URL for a collection page that lists all products from the given product vendor.

    {{ "Polina's Potent Potions" | url_for_vendor }}
        `,
        },
        {
          title: "within",
          url: "https://shopify.dev/docs/api/liquid/filters/within",
          keyword: ["filters", "collection"],
          category: "Filters",
          subcategory: "Collection",
          description: `Generates a product URL within the context of the provided collection. \n\n When the collection context is included, you can access the associated [collection object](https://shopify.dev/docs/api/liquid/objects/collection) in the [product template](https://shopify.dev/themes/architecture/templates/product). \n\n ## ⚠️ Caution \n\n Because a standard product page and a product page in the context of a collection have the same content on separate URLs, you should consider the SEO implications of using the \`within\` filter.

    {%- assign collection_product = collection.products.first -%}

    {{ collection_product.url | within: collection }}
        `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Filters: Color",
      items: [
        {
          title: "brightness_difference",
          url: "https://shopify.dev/docs/api/liquid/filters/brightness_difference",
          keyword: ["filters", "color"],
          category: "Filters",
          subcategory: "Color",
          description: `Calculates the [perceived brightness difference](https://www.w3.org/WAI/ER/WD-AERT/#color-contrast) between two colors.

    {{ '#E800B0' | brightness_difference: '#FECEE9' }}

        `,
        },
        {
          title: "color_brightness",
          url: "https://shopify.dev/docs/api/liquid/filters/color_brightness",
          keyword: ["filters", "color"],
          category: "Filters",
          subcategory: "Color",
          description: `Calculates the[ perceived brightness](https://www.w3.org/WAI/ER/WD-AERT/#color-contrast) of a given color.

    {{ '#E800B0' | brightness_difference: '#FECEE9' }}

        `,
        },
        {
          title: "color_contrast",
          url: "https://shopify.dev/docs/api/liquid/filters/color_contrast",
          keyword: ["filters", "color"],
          category: "Filters",
          subcategory: "Color",
          description: `Calculates the contrast ratio between two colors and returns the ratio's numerator. The ratio's denominator, which isn't returned, is always 1. For example, with a contrast ratio of 3.5:1, this filter returns 3.5. \n\n The order in which you specify the colors doesn't matter.

    {{ '#E800B0' | color_contrast: '#D9D8FF' }}

        `,
        },
        {
          title: "color_darken",
          url: "https://shopify.dev/docs/api/liquid/filters/color_darken",
          keyword: ["filters", "color"],
          category: "Filters",
          subcategory: "Color",
          description: `Darkens a given color by a specific percentage. The percentage must be between 0 and 100.

    {{ '#EA5AB9' | color_darken: 30 }}

        `,
        },
        {
          title: "color_desaturate",
          url: "https://shopify.dev/docs/api/liquid/filters/color_desaturate",
          keyword: ["filters", "color"],
          category: "Filters",
          subcategory: "Color",
          description: `Desaturates a given color by a specific percentage. The percentage must be between 0 and 100.

    {{ '#EA5AB9' | color_desaturate: 30 }}

        `,
        },
        {
          title: "color_difference",
          url: "https://shopify.dev/docs/api/liquid/filters/color_difference",
          keyword: ["filters", "color"],
          category: "Filters",
          subcategory: "Color",
          description: `Calculates the [color difference](https://www.w3.org/WAI/ER/WD-AERT/#color-contrast) between two colors.

    {{ '#720955' | color_difference: '#FFF3F9' }}

        `,
        },
        {
          title: "color_extract",
          url: "https://shopify.dev/docs/api/liquid/filters/color_extract",
          keyword: ["filters", "color"],
          category: "Filters",
          subcategory: "Color",
          description: `Extracts a specific color component from a given color. \n\n Accepts the following color components: \n\n - \`alpha\` \n\n - \`red\` \n\n - \`green\` \n\n - \`blue\` \n\n - \`hue\` \n\n - \`saturation\` \n\n - \`lightness\`

    {{ '#EA5AB9' | color_extract: 'red' }}

        `,
        },
        {
          title: "color_lighten",
          url: "https://shopify.dev/docs/api/liquid/filters/color_lighten",
          keyword: ["filters", "color"],
          category: "Filters",
          subcategory: "Color",
          description: `Lightens a given color by a specific percentage. The percentage must be between 0 and 100.

    {{ '#EA5AB9' | color_lighten: 30 }}

        `,
        },
        {
          title: "color_mix",
          url: "https://shopify.dev/docs/api/liquid/filters/color_mix",
          keyword: ["filters", "color"],
          category: "Filters",
          subcategory: "Color",
          description: `Blends two colors together by a specific percentage factor. The percentage must be between 0 and 100.

    {{ '#E800B0' | color_mix: '#00936F', 50 }}

        `,
        },
        {
          title: "color_modify",
          url: "https://shopify.dev/docs/api/liquid/filters/color_modify",
          keyword: ["filters", "color"],
          category: "Filters",
          subcategory: "Color",
          description: `Modifies a specific color component of a given color by a specific amount. \n\n The following table outlines valid color components, and the value range for their modifications.

    {{ '#EA5AB9' | color_modify: 'red', 255 }}

        `,
        },
        {
          title: "color_saturate",
          url: "https://shopify.dev/docs/api/liquid/filters/color_saturate",
          keyword: ["filters", "color"],
          category: "Filters",
          subcategory: "Color",
          description: `Saturates a given color by a specific percentage. The percentage must be between 0 and 100.

    {{ '#EA5AB9' | color_saturate: 30 }}

        `,
        },
        {
          title: "color_to_hex",
          url: "https://shopify.dev/docs/api/liquid/filters/color_to_hex",
          keyword: ["filters", "color"],
          category: "Filters",
          subcategory: "Color",
          description: `Converts a CSS color string to hexadecimal format \`(hex6)\`. \n\n Because colors are converted to \`hex6\` format, if a color with an alpha component is provided, then the alpha component is excluded from the output.

    {{ 'rgb(234, 90, 185)' | color_to_hex }}

        `,
        },
        {
          title: "color_to_hsl",
          url: "https://shopify.dev/docs/api/liquid/filters/color_to_hsl",
          keyword: ["filters", "color"],
          category: "Filters",
          subcategory: "Color",
          description: `Converts a CSS color string to \`HSL\` format. \n\n If a color with an alpha component is provided, the color is converted to \`HSLA\` format.

    {{ '#EA5AB9' | color_to_hsl }}

        `,
        },
        {
          title: "color_to_rgb",
          url: "https://shopify.dev/docs/api/liquid/filters/color_to_rgb",
          keyword: ["filters", "color"],
          category: "Filters",
          subcategory: "Color",
          description: `Converts a CSS color string to \`RGB\` format. \n\n If a color with an alpha component is provided, then the color is converted to \`RGBA\` format.

    {{ '#EA5AB9' | color_to_rgb }}

        `,
        },
        {
          title: "hex_to_rgba",
          url: "https://shopify.dev/docs/api/liquid/filters/hex_to_rgba",
          keyword: ["filters", "color"],
          category: "Filters",
          subcategory: "Color",
          isDeprecated: true,
          description: `Converts a CSS color string from hexadecimal format to \`RGBA\` format. Shorthand hexadecimal formatting (\`hex3\`) is also accepted. \n\n ## ⚠️ Deprecated \n\n The \`hex_to_rgba filter\` has been replaced by \`color_to_rgb\` and \`color_modify\`.

    {{ '#EA5AB9' | color_to_rgb }}

        `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Filters: Customer",
      items: [
        {
          title: "avatar",
          url: "https://shopify.dev/docs/api/liquid/filters/avatar",
          keyword: ["filters", "customer"],
          category: "Filters",
          subcategory: "Customer",
          description: `Generates HTML to render a customer's avatar, if available. Use with the \`customer.has_avatar?\` method to determine if the customer has an avatar.

    {{ customer | avatar }}

        `,
        },
        {
          title: "customer_login_link",
          url: "https://shopify.dev/docs/api/liquid/filters/customer_login_link",
          keyword: ["filters", "customer"],
          category: "Filters",
          subcategory: "Customer",
          description: `Generates an HTML link to the customer login page.

    {{ 'Log in' | customer_login_link }}

        `,
        },
        {
          title: "customer_logout_link",
          url: "https://shopify.dev/docs/api/liquid/filters/customer_logout_link",
          keyword: ["filters", "customer"],
          category: "Filters",
          subcategory: "Customer",
          description: `Generates an HTML link to log the customer out of their account and redirect to the homepage.

    {{ 'Log out' | customer_logout_link }}

        `,
        },
        {
          title: "customer_register_link",
          url: "https://shopify.dev/docs/api/liquid/filters/customer_register_link",
          keyword: ["filters", "customer"],
          category: "Filters",
          subcategory: "Customer",
          description: `Generates an HTML link to the customer registration page.

    {{ 'Create an account' | customer_register_link }}

        `,
        },
        {
          title: "login_button",
          url: "https://shopify.dev/docs/api/liquid/filters/login_button",
          keyword: ["filters", "customer"],
          category: "Filters",
          subcategory: "Customer",
          description: `Generates an HTML Button that enables a customer to follow the Shop in the Shop App \n\n Configure the storefront for Follow on Shop. [Learn more](https://help.shopify.com/manual/online-store/themes/customizing-themes/follow-on-shop?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3).

    {{ shop | login_button: action: 'follow' }}

        `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Filters: Default",
      items: [
        {
          title: "default",
          url: "https://shopify.dev/docs/api/liquid/filters/default",
          keyword: ["filters", "default"],
          category: "Filters",
          subcategory: "Default",
          description: `Sets a default value for any variable whose value is one of the following: \n\n - [empty](https://shopify.dev/docs/api/liquid/basics#empty)  \n\n - [false](https://shopify.dev/docs/api/liquid/basics#truthy-and-falsy)  \n\n - [nil](https://shopify.dev/docs/api/liquid/basics#nil)

    {{ product.selected_variant.url | default: product.url }}

        `,
        },
        {
          title: "default_errors",
          url: "https://shopify.dev/docs/api/liquid/filters/default_errors",
          keyword: ["filters", "default"],
          category: "Filters",
          subcategory: "Default",
          description: `Generates default error messages for each possible value of [form.errors](https://shopify.dev/docs/themes/liquid/reference/objects/form#form-errors).`,
        },
        {
          title: "default_pagination",
          url: "https://shopify.dev/docs/api/liquid/filters/default_pagination",
          keyword: ["filters", "default"],
          category: "Filters",
          subcategory: "Default",
          description: `Generates HTML for a set of links for paginated results. Must be applied to the [paginate object](https://shopify.dev/docs/api/liquid/objects/paginate).
          
    {% paginate collection.products by 2 %}
      {% for product in collection.products %}
        {{- product.title }}
      {% endfor %}

      {{- paginate | default_pagination -}}
    {% endpaginate %}
          
          
          `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Filters: Font",
      items: [
        {
          title: "font_face",
          url: "https://shopify.dev/docs/api/liquid/filters/font_face",
          keyword: ["filters", "font"],
          category: "Filters",
          subcategory: "Font",
          description: `Generates a CSS @font_face declaration to load the provided font.

    {{ settings.type_header_font | font_face }}

        `,
        },
        {
          title: "font_modify",
          url: "https://shopify.dev/docs/api/liquid/filters/font_modify",
          keyword: ["filters", "font"],
          category: "Filters",
          subcategory: "Font",
          description: `Modifies a specific property of a given font. \n\n The \`font_modify\` filter requires two parameters. The first indicates which property should be modified and the second is either the new value, or modification amount, for that property.

    {%- assign bold_font = settings.type_body_font | font_modify: 'weight', 'bold' -%}

    h2 {
      font-weight: {{ bold_font.weight }};
    }

        `,
        },
        {
          title: "font_url",
          url: "https://shopify.dev/docs/api/liquid/filters/font_url",
          keyword: ["filters", "font"],
          category: "Filters",
          subcategory: "Font",
          description: `Returns the [CDN URL](https://shopify.dev/themes/best-practices/performance/platform#shopify-cdn) for the provided font in woff2 format.

    {{ settings.type_header_font | font_url }}

        `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Filters: Format",
      items: [
        {
          title: "date",
          url: "https://shopify.dev/docs/api/liquid/filters/date",
          keyword: ["filters", "format"],
          category: "Filters",
          subcategory: "Format",
          description: `Converts a timestamp into another date format. \n\n The \`date\` filter accepts the same parameters as Ruby's strftime method for formatting the date. For a list of shorthand formats, refer to the [Ruby documentation](https://ruby-doc.org/core-3.1.1/Time.html#method-i-strftime) or [strftime reference and sandbox](http://www.strfti.me/).

    {{ article.created_at | date: '%B %d, %Y' }}

        `,
        },
        {
          title: "json",
          url: "https://shopify.dev/docs/api/liquid/filters/json",
          keyword: ["filters", "format"],
          category: "Filters",
          subcategory: "Format",
          description: `Converts a string, or object, into JSON format.

    {{ product | json }}

        `,
        },
        {
          title: "structured_data",
          url: "https://shopify.dev/docs/api/liquid/filters/structured_data",
          keyword: ["filters", "format"],
          category: "Filters",
          subcategory: "Format",
          description: `Converts an object into a schema.org structured data format. \n\n The \`structured_data\` filter can be used on the [product](https://shopify.dev/docs/api/liquid/objects/product) and [article](https://shopify.dev/docs/api/liquid/objects/article) objects. \n\n Product objects are output as a [schema.org Product](https://schema.org/Product) if they have no variants, and a [ProductGroup](https://schema.org/ProductGroup) if they have one or more variants. \n\n Article objects are output as a [schema.org Article](https://schema.org/Article).

    <script type="application/ld+json">
      {{ product | structured_data }}
    </script>

        `,
        },
        {
          title: "weight_with_unit",
          url: "https://shopify.dev/docs/api/liquid/filters/weight_with_unit",
          keyword: ["filters", "format"],
          category: "Filters",
          subcategory: "Format",
          description: `Generates a formatted weight for a [variant object](https://shopify.dev/docs/api/liquid/objects/variant#variant-weight). The weight unit is set in the [general settings](https://www.shopify.com/admin/settings/general?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3) in the Shopify admin.

    %- assign variant = product.variants.first -%}

    {{ variant.weight | weight_with_unit }}

        `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Filters: HTML",
      items: [
        {
          title: "class_list",
          url: "https://shopify.dev/docs/api/liquid/filters/class_list",
          keyword: ["filters", "html"],
          category: "Filters",
          subcategory: "HTML",
          description: `Wraps all instances of a specific string, within a given string, with an HTML \`<strong>\` tag with a \`class\` attribute of \`highlight\`.

    {% for item in search.results %}
      {% if item.object_type == 'product' %}
        {{ item.description | highlight: search.terms }}
      {% else %}
        {{ item.content | highlight: search.terms }}
      {% endif %}
    {% endfor %}

        `,
        },
        {
          title: "highlight",
          url: "https://shopify.dev/docs/api/liquid/filters/highlight",
          keyword: ["filters", "html"],
          category: "Filters",
          subcategory: "HTML",
          description: `Wraps all instances of a specific string, within a given string, with an HTML \`<strong>\` tag with a \`class\` attribute of \`highlight\`.

    {% for item in search.results %}
      {% if item.object_type == 'product' %}
        {{ item.description | highlight: search.terms }}
      {% else %}
        {{ item.content | highlight: search.terms }}
      {% endif %}
    {% endfor %}

        `,
        },
        {
          title: "inline_asset_content",
          url: "https://shopify.dev/docs/api/liquid/filters/inline_asset_content",
          keyword: ["filters", "html"],
          category: "Filters",
          subcategory: "HTML",
          description: `Outputs the content of an asset inline in the template. The asset must be either a \`SVG\`, \`JS\`, or \`CSS\` file. \n\n The asset size must be less than \`15KB\` to be inlined.

    {{ 'icon.svg' | inline_asset_content }}

        `,
        },
        {
          title: "link_to",
          url: "https://shopify.dev/docs/api/liquid/filters/link_to",
          keyword: ["filters", "html"],
          category: "Filters",
          subcategory: "HTML",
          description: `Generates an HTML \`<a>\` tag.

    {{ 'Shopify' | link_to: 'https://www.shopify.com' }}

        `,
        },
        {
          title: "placeholder_svg_tag",
          url: "https://shopify.dev/docs/api/liquid/filters/placeholder_svg_tag",
          keyword: ["filters", "html"],
          category: "Filters",
          subcategory: "HTML",
          description: `Generates an HTML <svg> tag for a given placeholder name.

    {{ 'collection-1' | placeholder_svg_tag }}

        `,
        },
        {
          title: "preload_tag",
          url: "https://shopify.dev/docs/api/liquid/filters/preload_tag",
          keyword: ["filters", "html"],
          category: "Filters",
          subcategory: "HTML",
          description: `Generates an HTML \`<link>\` tag with a \`rel\` attribute of \`preload\` to prioritize loading a given Shopify-hosted asset. The asset URL is also added to the [Link header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Link) with a \`rel\` attribute of \`preload\`. \n\n You should use this filter sparingly. For example, consider preloading only resources necessary for rendering above-the-fold content. To learn more about preloading resources, refer to [Performance best practices for Shopify themes](https://shopify.dev/themes/best-practices/performance#preload-key-resources-defer-or-avoid-loading-others).

    {{ 'collection-1' | placeholder_svg_tag }}

        `,
        },
        {
          title: "script_tag",
          url: "https://shopify.dev/docs/api/liquid/filters/script_tag",
          keyword: ["filters", "html"],
          category: "Filters",
          subcategory: "HTML",
          description: `Generates an HTML \`<script>\` tag for a given resource URL. The tag has a \`type\` attribute of \`text/javascript\`.

    {{ 'cart.js' | asset_url | script_tag }}

        `,
        },
        {
          title: "stylesheet_tag",
          url: "https://shopify.dev/docs/api/liquid/filters/stylesheet_tag",
          keyword: ["filters", "html"],
          category: "Filters",
          subcategory: "HTML",
          description: `Generates an HTML \`<link>\` tag for a given resource URL. The tag has the following parameters:

    {{ 'base.css' | asset_url | stylesheet_tag }}

        `,
        },
        {
          title: "time_tag",
          url: "https://shopify.dev/docs/api/liquid/filters/time_tag",
          keyword: ["filters", "html"],
          category: "Filters",
          subcategory: "HTML",
          description: `Converts a timestamp into an HTML \`<time>\` tag. \n\n The time_tag filter accepts the same parameters as Ruby's strftime method for formatting the date. For a list of shorthand formats, refer to the [Ruby documentation](https://ruby-doc.org/core-3.1.1/Time.html#method-i-strftime) or strftime [reference and sandbox](http://www.strfti.me/).

    {{ article.created_at | time_tag: '%B %d, %Y' }}

        `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Filters: Hosted File",
      items: [
        {
          title: "asset_img_url",
          url: "https://shopify.dev/docs/api/liquid/filters/asset_img_url",
          keyword: ["filters", "hosted file"],
          category: "Filters",
          subcategory: "Hosted File",
          description: `Returns the [CDN URL](https://shopify.dev/themes/best-practices/performance/platform#shopify-cdn) for an image in the [assets directory](https://shopify.dev/themes/architecture#assets) of a theme.

    {{ 'red-and-black-bramble-berries.jpg' | asset_img_url }}

        `,
        },
        {
          title: "asset_url",
          url: "https://shopify.dev/docs/api/liquid/filters/asset_url",
          keyword: ["filters", "hosted file"],
          category: "Filters",
          subcategory: "Hosted File",
          description: `Returns the [CDN URL](https://shopify.dev/themes/best-practices/performance/platform#shopify-cdn) for an file in the [assets directory](https://shopify.dev/themes/architecture#assets) of a theme.

    {{ 'cart.js' | asset_url }}

        `,
        },
        {
          title: "file_img_url",
          url: "https://shopify.dev/docs/api/liquid/filters/file_img_url",
          keyword: ["filters", "hosted file"],
          category: "Filters",
          subcategory: "Hosted File",
          description: `Returns the [CDN URL](https://shopify.dev/themes/best-practices/performance/platform#shopify-cdn) for an image from the [Files](https://www.shopify.com/admin/settings/files?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3) page of the Shopify admin.

    {{ 'potions-header.png' | file_img_url }}

        `,
        },
        {
          title: "file_url",
          url: "https://shopify.dev/docs/api/liquid/filters/file_url",
          keyword: ["filters", "hosted file"],
          category: "Filters",
          subcategory: "Hosted File",
          description: `Returns the [CDN URL](https://shopify.dev/themes/best-practices/performance/platform#shopify-cdn) for a file from the [Files](https://www.shopify.com/admin/settings/files?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3) page of the Shopify admin.

    {{ 'disclaimer.pdf' | file_url }}

        `,
        },
        {
          title: "global_asset_url",
          url: "https://shopify.dev/docs/api/liquid/filters/global_asset_url",
          keyword: ["filters", "hosted file"],
          category: "Filters",
          subcategory: "Hosted File",
          description: `Returns the [CDN URL](https://shopify.dev/themes/best-practices/performance/platform#shopify-cdn) for a global asset. \n\n Global assets are kept in a directory on Shopify's server. Using global assets can be faster than loading the resource directly. \n\n Depending on the resource type, you might need to use an additional filter to load the resource. The following table outlines which filter to use for specific resource types.

    {{ 'disclaimer.pdf' | file_url }}

        `,
        },
        {
          title: "shopify_asset_url",
          url: "https://shopify.dev/docs/api/liquid/filters/shopify_asset_url",
          keyword: ["filters", "hosted file"],
          category: "Filters",
          subcategory: "Hosted File",
          description: `Returns the [CDN URL](https://shopify.dev/themes/best-practices/performance/platform#shopify-cdn)  for a globally accessible Shopify asset. 

    {{ 'option_selection.js' | shopify_asset_url }}

        `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Filters: Localization",
      items: [
        {
          title: "currency_selector",
          url: "https://shopify.dev/docs/api/liquid/filters/currency_selector",
          keyword: ["filters", "localization"],
          category: "Filters",
          subcategory: "Localization",
          isDeprecated: true,
          description: `Generates an HTML \`<select>\` element with an option for each currency available on the store.

    {% form 'currency' %}
      {{ form | currency_selector }}
    {% endform %}

        `,
        },
        {
          title: "format_address",
          url: "https://shopify.dev/docs/api/liquid/filters/format_address",
          keyword: ["filters", "localization"],
          category: "Filters",
          subcategory: "Localization",
          description: `Generates an HTML address display, with each address component ordered according to the address's locale.

    {{ shop.address | format_address }}

        `,
        },
        {
          title: "translate",
          url: "https://shopify.dev/docs/api/liquid/filters/translate",
          keyword: ["filters", "localization"],
          category: "Filters",
          subcategory: "Localization",
          description: `Returns a string of translated text for a given translation key from a [locale file](https://shopify.dev/themes/architecture/locales). The \`translate\` filter has an alias of \`t\`, which is more commonly used.`,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Filters: Math",
      items: [
        {
          title: "abs",
          url: "https://shopify.dev/docs/api/liquid/filters/abs",
          keyword: ["filters", "math"],
          category: "Filters",
          subcategory: "Math",
          description: `Returns the absolute value of a number.

    {{ -3 | abs }}

        `,
        },
        {
          title: "at_least",
          url: "https://shopify.dev/docs/api/liquid/filters/at_least",
          keyword: ["filters", "math"],
          category: "Filters",
          subcategory: "Math",
          description: `Limits a number to a minimum value.

    {{ 4 | at_least: 5 }}

        `,
        },
        {
          title: "at_most",
          url: "https://shopify.dev/docs/api/liquid/filters/at_most",
          keyword: ["filters", "math"],
          category: "Filters",
          subcategory: "Math",
          description: `Limits a number to a minimum value.

    {{ 6 | at_most: 5 }}

        `,
        },
        {
          title: "ceil",
          url: "https://shopify.dev/docs/api/liquid/filters/ceil",
          keyword: ["filters", "math"],
          category: "Filters",
          subcategory: "Math",
          description: `Rounds a number up to the nearest integer.

    {{ 1.2 | ceil }}

        `,
        },
        {
          title: "divided_by",
          url: "https://shopify.dev/docs/api/liquid/filters/divided_by",
          keyword: ["filters", "math"],
          category: "Filters",
          subcategory: "Math",
          description: `Divides a number by a given number. The \`divided_by\` filter produces a result of the same type as the divisor. This means if you divide by an integer, the result will be an integer, and if you divide by a float, the result will be a float.

    {{ 4 | divided_by: 2 }}
    {{ 20 | divided_by: 7 }}
    {{ 20 | divided_by: 7.0 }}
        `,
        },
        {
          title: "floor",
          url: "https://shopify.dev/docs/api/liquid/filters/floor",
          keyword: ["filters", "math"],
          category: "Filters",
          subcategory: "Math",
          description: `Rounds a number down to the nearest integer.

    {{ 1.2 | floor }}
        `,
        },
        {
          title: "minus",
          url: "https://shopify.dev/docs/api/liquid/filters/minus",
          keyword: ["filters", "math"],
          category: "Filters",
          subcategory: "Math",
          description: `Subtracts a given number from another number.

    {{ 4 | minus: 2 }}
        `,
        },
        {
          title: "modulo",
          url: "https://shopify.dev/docs/api/liquid/filters/modulo",
          keyword: ["filters", "math"],
          category: "Filters",
          subcategory: "Math",
          description: `Returns the remainder of dividing a number by a given number.

    {{ 12 | modulo: 5 }}
        `,
        },
        {
          title: "plus",
          url: "https://shopify.dev/docs/api/liquid/filters/plus",
          keyword: ["filters", "math"],
          category: "Filters",
          subcategory: "Math",
          description: `Adds two numbers.

    {{ 2 | plus: 2 }}
        `,
        },
        {
          title: "round",
          url: "https://shopify.dev/docs/api/liquid/filters/round",
          keyword: ["filters", "math"],
          category: "Filters",
          subcategory: "Math",
          description: `Rounds a number to the nearest integer.

    {{ 2.7 | round }}
        `,
        },
        {
          title: "times",
          url: "https://shopify.dev/docs/api/liquid/filters/times",
          keyword: ["filters", "math"],
          category: "Filters",
          subcategory: "Math",
          description: `Multiplies a number by a given number.

    {{ 2 | times: 2 }}
        `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Filters: Media",
      items: [
        {
          title: "article_img_url",
          url: "https://shopify.dev/docs/api/liquid/filters/article_img_url",
          keyword: ["filters", "media"],
          category: "Filters",
          subcategory: "Media",
          isDeprecated: true,
          description: `Returns the [CDN URL](https://shopify.dev/themes/best-practices/performance/platform#shopify-cdn) for an [article's image](https://shopify.dev/docs/api/liquid/objects/article#article-image). \n\n ## ⚠️ Deprecated \n\n The \`article_img_url\` filter has been replaced by \`image_url\`.

    {{ article.image | article_img_url }}

        `,
        },
        {
          title: "collection_img_url",
          url: "https://shopify.dev/docs/api/liquid/filters/collection_img_url",
          keyword: ["filters", "media"],
          category: "Filters",
          subcategory: "Media",
          isDeprecated: true,
          description: `Returns the [CDN URL](https://shopify.dev/themes/best-practices/performance/platform#shopify-cdn) for an [collection's image](https://shopify.dev/docs/api/liquid/objects/collection#collection-image). \n\n ## ⚠️ Deprecated \n\n The \`collection_img_url\` filter has been replaced by \`image_url\`.

    {{ collection.image | collection_img_url }}

        `,
        },
        {
          title: "external_video_tag",
          url: "https://shopify.dev/docs/api/liquid/filters/external_video_tag",
          keyword: ["filters", "media"],
          category: "Filters",
          subcategory: "Media",
          description: `Generates an HTML \`<iframe>\` tag containing the player for a given external video. The input for the \`external_video_tag\` filter can be either a [media object](https://shopify.dev/docs/api/liquid/objects/media) or [external_video_url](https://shopify.dev/docs/api/liquid/filters/external_video_url). \n\n If [alt text is set on the video](https://help.shopify.com/en/manual/products/product-media/add-alt-text?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3), then it's included in the \`title\` attribute of the \`<iframe>\`. If no alt text is set, then the \`title\` attribute is set to the product title.

    {% for media in product.media %}
      {% if media.media_type == 'external_video' %}
        {% if media.host == 'youtube' %}
          {{ media | external_video_url: color: 'white' | external_video_tag }}
        {% elsif media.host == 'vimeo' %}
          {{ media | external_video_url: loop: '1', muted: '1' | external_video_tag }}
        {% endif %}
      {% endif %}
    {% endfor %}

        `,
        },
        {
          title: "external_video_url",
          url: "https://shopify.dev/docs/api/liquid/filters/external_video_url",
          keyword: ["filters", "media"],
          category: "Filters",
          subcategory: "Media",
          description: `Returns the URL for a given external video. Use this filter to specify parameters for the external video player generated by the [external_video_tag filter](https://shopify.dev/docs/api/liquid/filters/external_video_tag). \n\n You can specify [YouTube](https://developers.google.com/youtube/player_parameters#Parameters) and [Vimeo](https://vimeo.zendesk.com/hc/en-us/articles/360001494447-Using-Player-Parameters) video parameters by adding a parameter that matches the parameter name, and the desired value.

    {% for media in product.media %}
      {% if media.media_type == 'external_video' %}
        {% if media.host == 'youtube' %}
          {{ media | external_video_url: color: 'white' | external_video_tag }}
        {% elsif media.host == 'vimeo' %}
          {{ media | external_video_url: loop: '1', muted: '1' | external_video_tag }}
        {% endif %}
      {% endif %}
    {% endfor %}

        `,
        },
        {
          title: "image_tag",
          url: "https://shopify.dev/docs/api/liquid/filters/image_tag",
          keyword: ["filters", "media"],
          category: "Filters",
          subcategory: "Media",
          description: `Generates an HTML \`<img>\` tag for a given [image_url](https://shopify.dev/docs/api/liquid/filters/image_url). \n\n By default, \`width\` and \`height\` attributes are added to the \`<img>\` tag based on the dimensions and aspect ratio from the image URL. However, you can override these attributes with the [width](https://shopify.dev/docs/api/liquid/filters/image_tag#image_tag-width) and [height](https://shopify.dev/docs/api/liquid/filters/image_tag#image_tag-height) parameters. If only one parameter is provided, then only that attribute is added.

    {{ product | image_url: width: 200 | image_tag }}

        `,
        },
        {
          title: "image_url",
          url: "https://shopify.dev/docs/api/liquid/filters/image_url",
          keyword: ["filters", "media"],
          category: "Filters",
          subcategory: "Media",
          description: `Returns the [CDN URL](https://shopify.dev/themes/best-practices/performance/platform#shopify-cdn) for an image.

    {{ product | image_url: width: 200 | image_tag }}

        `,
        },
        {
          title: "img_tag",
          url: "https://shopify.dev/docs/api/liquid/filters/img_tag",
          keyword: ["filters", "media"],
          category: "Filters",
          subcategory: "Media",
          isDeprecated: true,
          description: `Generates an HTML <img> tag for a given image URL.

    {{ product | img_tag }}

        `,
        },
        {
          title: "img_url",
          url: "https://shopify.dev/docs/api/liquid/filters/img_url",
          keyword: ["filters", "media"],
          category: "Filters",
          subcategory: "Media",
          isDeprecated: true,
          description: `Returns the [CDN URL](https://shopify.dev/themes/best-practices/performance/platform#shopify-cdn) for an image.

    {{ product | img_url }}

        `,
        },
        {
          title: "media_tag",
          url: "https://shopify.dev/docs/api/liquid/filters/media_tag",
          keyword: ["filters", "media"],
          category: "Filters",
          subcategory: "Media",
          description: `Generates an appropriate HTML tag for a given media object.

    {% for media in product.media %}
      {{- media | media_tag }}
    {% endfor %}

        `,
        },
        {
          title: "model_viewer_tag",
          url: "https://shopify.dev/docs/api/liquid/filters/model_viewer_tag",
          keyword: ["filters", "media"],
          category: "Filters",
          subcategory: "Media",
          description: `Generates a [Google model viewer component](https://modelviewer.dev/) for a given 3D model.

    {% for media in product.media %}
      {% if media.media_type == 'model' %}
        {{ media | model_viewer_tag }}
      {% endif %}
    {% endfor %}

        `,
        },
        {
          title: "product_img_url",
          url: "https://shopify.dev/docs/api/liquid/filters/product_img_url",
          keyword: ["filters", "media"],
          category: "Filters",
          subcategory: "Media",
          isDeprecated: true,
          description: `Returns the [CDN URL](https://shopify.dev/themes/best-practices/performance/platform#shopify-cdn) for a [product image](https://shopify.dev/docs/api/liquid/objects/product).

    {{ product.featured_image | product_img_url }}

        `,
        },
        {
          title: "video_tag",
          url: "https://shopify.dev/docs/api/liquid/filters/video_tag",
          keyword: ["filters", "media"],
          category: "Filters",
          subcategory: "Media",
          description: `Generates an HTML \`<video>\` tag for a given video.

    {% for media in product.media %}
      {% if media.media_type == 'video' %}
        {{ media | video_tag }}
      {% endif %}
    {% endfor %}

        `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Filters: Metafield",
      items: [
        {
          title: "metafield_tag",
          url: "https://shopify.dev/docs/api/liquid/filters/metafield_tag",
          keyword: ["filters", "metafield"],
          category: "Filters",
          subcategory: "Metafield",
          description: `Generates an HTML element to host the metafield data. The type of element that's generated differs depending on the type of metafield.

    {{ product.metafields.information.seasonal | metafield_tag }}

        `,
        },
        {
          title: "metafield_text",
          url: "https://shopify.dev/docs/api/liquid/filters/metafield_text",
          keyword: ["filters", "metafield"],
          category: "Filters",
          subcategory: "Metafield",
          description: `Generates a text version of the metafield data.

    {{ product.metafields.information.dosage | metafield_text }}

        `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Filters: Money",
      items: [
        {
          title: "money",
          url: "https://shopify.dev/docs/api/liquid/filters/money",
          keyword: ["filters", "money"],
          category: "Filters",
          subcategory: "Money",
          description: `Formats a given price based on the store's [HTML without currency setting](https://help.shopify.com/manual/payments/currency-formatting?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3).

    {{ product.price | money }}

        `,
        },
        {
          title: "money_with_currency",
          url: "https://shopify.dev/docs/api/liquid/filters/money_with_currency",
          keyword: ["filters", "money"],
          category: "Filters",
          subcategory: "Money",
          description: `Formats a given price based on the store's [HTML with currency setting](https://help.shopify.com/manual/payments/currency-formatting?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3).

    {{ product.price | money_with_currency }}

        `,
        },
        {
          title: "money_without_currency",
          url: "https://shopify.dev/docs/api/liquid/filters/money_without_currency",
          keyword: ["filters", "money"],
          category: "Filters",
          subcategory: "Money",
          description: `Formats a given price based on the store's [HTML without currency setting](https://help.shopify.com/manual/payments/currency-formatting?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3), without the currency symbol.

    {{ product.price | money_without_currency }}

        `,
        },
        {
          title: "money_without_trailing_zeros",
          url: "https://shopify.dev/docs/api/liquid/filters/money_without_trailing_zeros",
          keyword: ["filters", "money"],
          category: "Filters",
          subcategory: "Money",
          description: `Formats a given price based on the store's [HTML without currency setting](https://help.shopify.com/manual/payments/currency-formatting?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3), excluding the decimal separator (either \`.\` or \`,\`) and trailing zeros.

    {{ product.price | money_without_trailing_zeros }}

        `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Filters: Payment",
      items: [
        {
          title: "payment_button",
          url: "https://shopify.dev/docs/api/liquid/filters/payment_button",
          keyword: ["filters", "payment"],
          category: "Filters",
          subcategory: "Payment",
          description: `Generates an HTML container to host [dynamic checkout buttons](https://help.shopify.com/manual/online-store/dynamic-checkout?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3) for a product. The \`payment_button\` filter must be used on the form object within a [product form](https://shopify.dev/docs/api/liquid/tags/form#form-product).

    {% form 'product', product %}
      {{ form | payment_button }}
    {% endform %}

        `,
        },
        {
          title: "payment_terms",
          url: "https://shopify.dev/docs/api/liquid/filters/payment_terms",
          keyword: ["filters", "payment"],
          category: "Filters",
          subcategory: "Payment",
          description: `Generates the HTML for the [Shop Pay Installments banner](https://shopify.dev/themes/pricing-payments/installments). \n\n The \`payment_terms\` filter must be used on the \`form\` object within a [product form](https://shopify.dev/docs/api/liquid/tags/form#form-product) or cart form.

    {% form 'product', product %}
      {{ form | payment_terms }}
    {% endform %}

        `,
        },
        {
          title: "payment_type_img_url",
          url: "https://shopify.dev/docs/api/liquid/filters/payment_type_img_url",
          keyword: ["filters", "payment"],
          category: "Filters",
          subcategory: "Payment",
          description: `Returns the URL for an SVG image of a given [payment type](https://shopify.dev/docs/api/liquid/objects/shop#shop-enabled_payment_types).

    {% for type in shop.enabled_payment_types %}
      <img src="{{ type | payment_type_img_url }}" width="50" height="50" />
    {% endfor %}

        `,
        },
        {
          title: "payment_type_svg_tag",
          url: "https://shopify.dev/docs/api/liquid/filters/payment_type_svg_tag",
          keyword: ["filters", "payment"],
          category: "Filters",
          subcategory: "Payment",
          description: `Generates an HTML \`<svg>\` tag for a given [payment type](https://shopify.dev/docs/api/liquid/objects/shop#shop-enabled_payment_types).

    {% for type in shop.enabled_payment_types -%}
      {{ type | payment_type_svg_tag }}
    {% endfor %}

        `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Filters: String",
      items: [
        {
          title: "append",
          url: "https://shopify.dev/docs/api/liquid/filters/append",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Adds a given string to the end of a string.

    {%-  assign path = product.url -%}

    {{ request.origin | append: path }}

        `,
        },
        {
          title: "base64_decode",
          url: "https://shopify.dev/docs/api/liquid/filters/base64_decode",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Decodes a string in [Base64 format](https://developer.mozilla.org/en-US/docs/Glossary/Base64).

    {{ 'b25lIHR3byB0aHJlZQ==' | base64_decode }}

        `,
        },
        {
          title: "base64_encode",
          url: "https://shopify.dev/docs/api/liquid/filters/base64_encode",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Encodes a string to [Base64 format](https://developer.mozilla.org/en-US/docs/Glossary/Base64).

    {{ 'one two three' | base64_encode }}

        `,
        },
        {
          title: "base64_url_safe_decode",
          url: "https://shopify.dev/docs/api/liquid/filters/base64_url_safe_decode",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Decodes a string in URL-safe [Base64 format](https://developer.mozilla.org/en-US/docs/Glossary/Base64).

    {{ 'b25lIHR3byB0aHJlZQ==' | base64_url_safe_decode }}

        `,
        },
        {
          title: "base64_url_safe_encode",
          url: "https://shopify.dev/docs/api/liquid/filters/base64_url_safe_encode",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Encodes a string to URL-safe [Base64 format](https://developer.mozilla.org/en-US/docs/Glossary/Base64). \n\n To produce URL-safe Base64, this filter uses \`-\` and \`_\` in place of \`+\` and \`/\`.

    {{ 'one two three' | base64_url_safe_encode }}

        `,
        },
        {
          title: "camelize",
          url: "https://shopify.dev/docs/api/liquid/filters/camelize",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Converts a string to CamelCase.

    {{ 'variable-name' | camelize }}

        `,
        },
        {
          title: "capitalize",
          url: "https://shopify.dev/docs/api/liquid/filters/capitalize",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Capitalizes the first word in a string and downcases the remaining characters.

    {{ 'this sentence should start with a capitalized word.' | capitalize }}

        `,
        },
        {
          title: "downcase",
          url: "https://shopify.dev/docs/api/liquid/filters/downcase",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Converts a string to all lowercase characters.

    {{ product.title | downcase }}

        `,
        },
        {
          title: "escape",
          url: "https://shopify.dev/docs/api/liquid/filters/escape",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Escapes special characters in HTML, such as \`<>\`, \`'\`, and \`&\`, and converts characters into escape sequences. The filter doesn't effect characters within the string that don’t have a corresponding escape sequence.".

    {{ '<p>Text to be escaped.</p>' | escape }}

        `,
        },
        {
          title: "escape",
          url: "https://shopify.dev/docs/api/liquid/filters/escape",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Escapes special characters in HTML, such as \`<>\`, \`'\`, and \`&\`, and converts characters into escape sequences. The filter doesn't effect characters within the string that don’t have a corresponding escape sequence.".

    {{ '<p>Text to be escaped.</p>' | escape }}

        `,
        },
        {
          title: "escape_once",
          url: "https://shopify.dev/docs/api/liquid/filters/escape_once",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Escapes a string without changing characters that have already been escaped.

    {{ "&lt;p&gt;Text to be escaped.&lt;/p&gt;" | escape }}

        `,
        },
        {
          title: "handleize",
          url: "https://shopify.dev/docs/api/liquid/filters/handleize",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Converts a string into a [handle](https://shopify.dev/docs/api/liquid/basics#handles).

    {{ product.title | handleize }}

        `,
        },
        {
          title: "hmac_sha1",
          url: "https://shopify.dev/docs/api/liquid/filters/hmac_sha1",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Converts a string into an SHA-1 hash using a hash message authentication code (HMAC). \n\n The secret key for the message is supplied as a parameter to the filter.

    {%- assign secret_potion = 'Polyjuice' | hmac_sha1: 'Polina' -%}

        `,
        },
        {
          title: "hmac_sha256",
          url: "https://shopify.dev/docs/api/liquid/filters/hmac_sha256",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Converts a string into an SHA-256 hash using a hash message authentication code (HMAC). \n\n The secret key for the message is supplied as a parameter to the filter.

    {%- assign secret_potion = 'Polyjuice' | hmac_sha1: 'Polina' -%}

        `,
        },
        {
          title: "lstrip",
          url: "https://shopify.dev/docs/api/liquid/filters/lstrip",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Strips all whitespace from the left of a string.

    {%- assign text = '  Some potions create whitespace.      ' -%}
    "{{ text | lstrip }}"
        `,
        },
        {
          title: "md5",
          url: "https://shopify.dev/docs/api/liquid/filters/md5",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Converts a string into an MD5 hash.

    {{ '' | md5 }}
        `,
        },
        {
          title: "newline_to_br",
          url: "https://shopify.dev/docs/api/liquid/filters/newline_to_br",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Converts newlines (\`\n\`) in a string to HTML line breaks (\`<br>\`).

    {{ product.description | newline_to_br }}
        `,
        },
        {
          title: "pluralize",
          url: "https://shopify.dev/docs/api/liquid/filters/pluralize",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Outputs the singular or plural version of a string based on a given number. \n\n ## ⚠️ Caution \n\n The \`pluralize\` filter applies English pluralization rules to determine which string to output. You shouldn't use this filter on non-English strings because it could lead to incorrect pluralizations.

    Cart item count: {{ cart.item_count }} {{ cart.item_count | pluralize: 'item', 'items' }}
        `,
        },
        {
          title: "prepend",
          url: "https://shopify.dev/docs/api/liquid/filters/prepend",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Adds a given string to the beginning of a string.

    {%- assign origin = request.origin -%}

    {{ product.url | prepend: origin }}
        `,
        },
        {
          title: "remove",
          url: "https://shopify.dev/docs/api/liquid/filters/remove",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Removes any instance of a substring inside a string.

    {{ "I can't do it!" | remove: "'t" }}

        `,
        },
        {
          title: "remove_first",
          url: "https://shopify.dev/docs/api/liquid/filters/remove_first",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Removes the first instance of a substring inside a string.

    {{ "I hate it when I accidentally spill my duplication potion accidentally!" | remove_first: ' accidentally' }}

        `,
        },
        {
          title: "remove_last",
          url: "https://shopify.dev/docs/api/liquid/filters/remove_last",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Removes the last instance of a substring inside a string.

    { "I hate it when I accidentally spill my duplication potion accidentally!" | remove_last: ' accidentally' }}

        `,
        },
        {
          title: "replace",
          url: "https://shopify.dev/docs/api/liquid/filters/replace",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Replaces any instance of a substring inside a string with a given string.

    {{ product.handle | replace: '-', ' ' }}

        `,
        },
        {
          title: "replace_first",
          url: "https://shopify.dev/docs/api/liquid/filters/replace_first",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Replaces the first instance of a substring inside a string with a given string.

    {{ product.handle | replace_first: '-', ' ' }}

        `,
        },
        {
          title: "replace_last",
          url: "https://shopify.dev/docs/api/liquid/filters/replace_last",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Replaces the last instance of a substring inside a string with a given string.

    {{ product.handle | replace_last: '-', ' ' }}

        `,
        },
        {
          title: "rstrip",
          url: "https://shopify.dev/docs/api/liquid/filters/rstrip",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Strips all whitespace from the right of a string.

    {%- assign text = '  Some potions create whitespace.      ' -%}
    
    "{{ text }}"
    "{{ text | rstrip }}"

        `,
        },
        {
          title: "sha1",
          url: "https://shopify.dev/docs/api/liquid/filters/sha1",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Converts a string into an SHA-1 hash.

    {%- assign secret_potion = 'Polyjuice' | sha1 -%}

    My secret potion: {{ secret_potion }}

        `,
        },
        {
          title: "sha256",
          url: "https://shopify.dev/docs/api/liquid/filters/sha256",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Converts a string into an SHA-256 hash.

    {%- assign secret_potion = 'Polyjuice' | sha256 -%}

    My secret potion: {{ secret_potion }}

        `,
        },
        {
          title: "slice",
          url: "https://shopify.dev/docs/api/liquid/filters/slice",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Returns a substring or series of array items, starting at a given 0-based index. \n\n By default, the substring has a length of one character, and the array series has one array item. However, you can provide a second parameter to specify the number of characters or array items.

    {{ collection.title | slice: 0 }}
    {{ collection.title | slice: 0, 5 }}

    {{ collection.all_tags | slice: 1, 2 | join: ', ' }}

        `,
        },
        {
          title: "split",
          url: "https://shopify.dev/docs/api/liquid/filters/split",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Splits a string into an array of substrings based on a given separator.

    {%- assign title_words = product.handle | split: '-' -%}

    {% for word in title_words -%}
      {{ word }}
    {%- endfor %}

        `,
        },
        {
          title: "strip",
          url: "https://shopify.dev/docs/api/liquid/filters/strip",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Strips all whitespace from the left and right of a string.

    {%- assign text = '  Some potions create whitespace.      ' -%}

    "{{ text }}"
    "{{ text | strip }}"

        `,
        },
        {
          title: "strip_html",
          url: "https://shopify.dev/docs/api/liquid/filters/strip_html",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Strips all HTML tags from a string.

    <!-- With HTML -->
    {{ product.description }}

    <!-- HTML stripped -->
    {{ product.description | strip_html }}

        `,
        },
        {
          title: "strip_newlines",
          url: "https://shopify.dev/docs/api/liquid/filters/strip_newlines",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Strips all newline characters (line breaks) from a string.

    !-- With newlines -->
    {{ product.description }}

    <!-- Newlines stripped -->
    {{ product.description | strip_newlines }}

        `,
        },
        {
          title: "truncate",
          url: "https://shopify.dev/docs/api/liquid/filters/truncate",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Truncates a string down to a given number of characters. \n\n If the specified number of characters is less than the length of the string, then an ellipsis (\`...\`) is appended to the truncated string. The ellipsis is included in the character count of the truncated string.

    {{ article.title | truncate: 15 }}

        `,
        },
        {
          title: "truncatewords",
          url: "https://shopify.dev/docs/api/liquid/filters/truncatewords",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Truncates a string down to a given number of words. \n\n If the specified number of words is less than the number of words in the string, then an ellipsis (\`...\`) is appended to the truncated string. \n\n ## ⚠️ Caution \n\n HTML tags are treated as words, so you should strip any HTML from truncated content. If you don't strip HTML, then closing HTML tags can be removed, which can result in unexpected behavior.

    {{ article.content | strip_html | truncatewords: 15 }}

        `,
        },
        {
          title: "upcase",
          url: "https://shopify.dev/docs/api/liquid/filters/upcase",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Converts a string to all uppercase characters.

    {{ product.title | upcase }}

        `,
        },
        {
          title: "url_decode",
          url: "https://shopify.dev/docs/api/liquid/filters/url_decode",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Decodes any [percent-encoded](https://developer.mozilla.org/en-US/docs/Glossary/percent-encoding) characters in a string.

    {{ 'test%40test.com' | url_decode }}

        `,
        },
        {
          title: "url_encode",
          url: "https://shopify.dev/docs/api/liquid/filters/url_encode",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Converts any URL-unsafe characters in a string to the [percent-encoded](https://developer.mozilla.org/en-US/docs/Glossary/percent-encoding) equivalent.

    {{ 'test@test.com' | url_encode }}

        `,
        },
        {
          title: "url_escape",
          url: "https://shopify.dev/docs/api/liquid/filters/url_escape",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Escapes any URL-unsafe characters in a string.

    {{ '<p>Health & Love potions</p>' | url_escape }}

        `,
        },
        {
          title: "url_param_escape",
          url: "https://shopify.dev/docs/api/liquid/filters/url_param_escape",
          keyword: ["filters", "string"],
          category: "Filters",
          subcategory: "String",
          description: `Escapes any characters in a string that are unsafe for URL parameters. \n\n The \`url_param_escape\` filter escapes the same characters as [url_escape](https://shopify.dev/docs/api/liquid/filters/url_escape), with the addition of \`&\`.

    {{ '<p>Health & Love potions</p>' | url_param_escape }}

        `,
        },
      ],
    },
  },
  {
    section: {
      sectionTitle: "Filters: Tag",
      items: [
        {
          title: "link_to_add_tag",
          url: "https://shopify.dev/docs/api/liquid/filters/link_to_add_tag",
          keyword: ["filters", "tag"],
          category: "Filters",
          subcategory: "Tag",
          description: `Generates an HTML \`<a>\` tag with an \`href\` attribute linking to the current blog or collection, filtered to show only articles or products that have a given tag, as well as any currently active tags.

    {% for tag in collection.all_tags %}
      {%- if current_tags contains tag -%}
        {{ tag }}
      {%- else -%}
        {{ tag | link_to_add_tag: tag }}
      {%- endif -%}
    {% endfor %}

        `,
        },
        {
          title: "link_to_remove_tag",
          url: "https://shopify.dev/docs/api/liquid/filters/link_to_remove_tag",
          keyword: ["filters", "tag"],
          category: "Filters",
          subcategory: "Tag",
          description: `Generates an HTML \`<a>\` tag with an \`href\` attribute linking to the current blog or collection, filtered to show only articles or products that have any currently active tags, except the provided tag.

    {% for tag in collection.all_tags %}
      {%- if current_tags contains tag -%}
        {{ tag | link_to_remove_tag: tag }}
      {%- else -%}
        {{ tag | link_to_add_tag: tag }}
      {%- endif -%}
    {% endfor %}

        `,
        },
        {
          title: "link_to_tag",
          url: "https://shopify.dev/docs/api/liquid/filters/link_to_tag",
          keyword: ["filters", "tag"],
          category: "Filters",
          subcategory: "Tag",
          description: `Generates an HTML \`<a>\` tag with an \`href\` attribute linking to the current blog or collection, filtered to show only articles or products that have a given tag.

    {% for tag in collection.all_tags %}
      {{- tag | link_to_tag: tag }}
    {% endfor %}

        `,
        },
      ],
    },
  },

  {
    section: {
      sectionTitle: "Objects",
      items: [
        {
          title: "additional_checkout_buttons",
          url: "https://shopify.dev/docs/api/liquid/objects/additional_checkout_buttons",
          keyword: ["objects"],
          category: "Objects",
          description: `Returns \`true\` if a store has any payment providers with offsite checkouts, such as PayPal Express Checkout. \n\n Use \`additional_checkout_buttons\` to check whether these payment providers exist, and [content_for_additional_checkout_buttons](https://shopify.dev/docs/api/liquid/objects/content_for_additional_checkout_buttons) to show the associated checkout buttons. To learn more about how to use these objects, refer to [Accelerated checkout](https://shopify.dev/themes/pricing-payments/accelerated-checkout).
          
    {% if additional_checkout_buttons %}
      {{ content_for_additional_checkout_buttons }}
    {% endif %}
          
          `,
        },
        {
          title: "address",
          url: "https://shopify.dev/docs/api/liquid/objects/address",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "address1", type: "string" },
            { name: "address2", type: "string" },
            { name: "city", type: "string" },
            { name: "company", type: "string" },
            { name: "country", type: "country" },
            { name: "country_code", type: "string" },
            { name: "country_name", type: "string" },
            { name: "first_name", type: "string" },
            { name: "id", type: "number" },
            { name: "last_name", type: "string" },
            { name: "name", type: "string" },
            { name: "phone", type: "string" },
            { name: "province", type: "string" },
            { name: "province_code", type: "string" },
            { name: "street", type: "string" },
            { name: "summary", type: "string" },
            { name: "url", type: "string" },
            { name: "zip", type: "string" },
          ],
          description: `An address, such as a customer address or order shipping address. \n\n
          
    {
      "address1": "150 Elgin Street",
      "address2": "8th floor",
      "city": "Ottawa",
      "company": "Polina's Potions, LLC",
      "country": {},
      "country_code": "CA",
      "first_name": null,
      "id": 56174706753,
      "last_name": null,
      "name": "",
      "phone": "416-123-1234",
      "province": "Ontario",
      "province_code": "ON",
      "street": "150 Elgin Street, 8th floor",
      "summary": "150 Elgin Street, 8th floor, Ottawa, Ontario, Canada",
      "url": "/account/addresses/56174706753",
      "zip": "K2P 1L4"
    }

          `,
        },
        {
          title: "all_country_option_tags",
          url: "https://shopify.dev/docs/api/liquid/objects/all_country_option_tags",
          keyword: ["objects"],
          category: "Objects",
          description: `Creates an \`<option>\` tag for each country. \n\n An attribute called \`data-provinces\` is set for each \`<option>\`, and contains a JSON-encoded array of the country or region's subregions. If a country doesn't have any subregions, then an empty array is set for its \`data-provinces\` attribute. \n\n You can wrap the \`all_country_option_tags\` object in \`<select>\` tags to build a country option selector. 

    <select name="country">
      {{ all_country_option_tags }}
    </select>
          
          `,
        },
        {
          title: "all_products",
          url: "https://shopify.dev/docs/api/liquid/objects/all_products",
          keyword: ["objects"],
          category: "Objects",
          description: `All of the products on a store. \n\n The \`all_products\` object has a limit of 20 unique handles per page. If you want more than 20 products, then consider using a collection instead. \n\n You can use \`all_products\` to access a product by its [handle](https://shopify.dev/docs/api/liquid/basics#handles). If the product isn't found, then \`empty\` is returned.
          
    {{ all_products['love-potion'].title }}     
          `,
        },
        {
          title: "app",
          url: "https://shopify.dev/docs/api/liquid/objects/app",
          keyword: ["objects"],
          category: "Objects",
          description: `An app. This object is usually used to access app-specific information for use with [theme app extensions](https://shopify.dev/apps/online-store/theme-app-extensions).`,
        },
        {
          title: "article",
          url: "https://shopify.dev/docs/api/liquid/objects/article",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "author", type: "string" },
            { name: "comment_post_url", type: "string" },
            { name: "comments", type: "array of comment" },
            { name: "comments_count", type: "number" },
            { name: "comments_enabled", type: "boolean" },
            { name: "content", type: "string" },
            { name: "created_at", type: "string" },
            { name: "excerpt", type: "string" },
            { name: "excerpt_or_content", type: "string" },
            { name: "handle", type: "string" },
            { name: "id", type: "string" },
            { name: "image", type: "image" },
            { name: "metafields", type: "" },
            { name: "moderated?", type: "boolean" },
            { name: "published_at", type: "string" },
            { name: "tags", type: "array of string" },
            { name: "template_suffix", type: "string" },
            { name: "title", type: "string" },
            { name: "updated_at", type: "string" },
            { name: "url", type: "string" },
            { name: "user", type: "string" },
          ],
          description: `An article, or [blog post](https://help.shopify.com/manual/online-store/blogs/writing-blogs?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3), in a blog. \n\n
          
    {
      "author": "Polina Waters",
      "comment_post_url": "/blogs/potion-notions/how-to-tell-if-you-have-run-out-of-invisibility-potion/comments",
      "comments": [],
      "comments_count": 1,
      "comments_enabled?": true,
      "content": "<p>We've all had this problem before: we peek into the potions vault to determine which potions we are running low on, and the invisibility potion bottle looks completely empty.</p>",
      "created_at": "2022-04-14 16:56:02 -0400",
      "excerpt": "And where to buy <strong>more</strong>!",
      "excerpt_or_content": "And where to buy <strong>more</strong>!",
      "handle": "potion-notions/how-to-tell-if-you-have-run-out-of-invisibility-potion",
      "id": 556510085185,
      "image": {},
      "metafields": {},
      "moderated?": true,
      "published_at": "2022-04-14 16:56:02 -0400",
      "tags": [],
      "template_suffix": "",
      "title": "How to tell if you're out of invisibility potion",
      "updated_at": "2022-06-04 19:27:33 -0400",
      "url": {},
      "user": {}
    }
          `,
        },
        {
          title: "articles",
          url: "https://shopify.dev/docs/api/liquid/objects/articles",
          keyword: ["objects"],
          category: "Objects",
          description: `All of the articles across the blogs in the store. \n\n You can use \`articles\` to access an article by its [handle](https://shopify.dev/docs/api/liquid/basics#handles).
          
    {% assign article = articles['potion-notions/new-potions-for-spring'] %}
    {{ article.title | link_to: article.url }}
          
          `,
        },
        {
          title: "block",
          url: "https://shopify.dev/docs/api/liquid/objects/block",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "id", type: "string" },
            { name: "settings", type: "" },
            { name: "shopify_attributes", type: "string" },
            { name: "type", type: "string" },
          ],
          description: `The content and settings of a [section block](https://shopify.dev/themes/architecture/sections/section-schema#blocks). \n\n Sections and blocks are reusable modules of content that make up [templates](https://shopify.dev/themes/architecture/templates). \n\n To learn more about using blocks, refer to the [Shopify Partners blog](https://www.shopify.com/partners/blog/theme-blocks?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3).

    {
      "id": "column1",
      "settings": "array",
      "shopify_attributes": "data-shopify-editor-block=\\"{\\"id\\":\\"column1\\",\\"type\\":\\"column\\"}\\"",
      "type": "column"
    }
          `,
        },
        {
          title: "blog",
          url: "https://shopify.dev/docs/api/liquid/objects/blog",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "all_tags", type: "array of string" },
            { name: "articles", type: "array of article" },
            { name: "articles_count", type: "number" },
            { name: "comments_enabled?", type: "boolean" },
            { name: "handle", type: "string" },
            { name: "id", type: "number" },
            { name: "metafields", type: "array of metafield" },
            { name: "moderated?", type: "boolean" },
            { name: "next_article", type: "article" },
            { name: "previous_article", type: "article" },
            { name: "tags", type: "array of string" },
            { name: "template_suffix", type: "string" },
            { name: "title", type: "string" },
            { name: "url", type: "string" },
          ],
          description: `Information about a specific [blog](https://help.shopify.com/manual/online-store/blogs/adding-a-blog?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3) in the store.

    {
      "all_tags": [],
      "articles": [],
      "articles_count": 3,
      "comments_enabled?": true,
      "handle": "potion-notions",
      "id": 78580613185,
      "metafields": {},
      "moderated?": true,
      "next_article": {},
      "previous_article": {},
      "tags": [],
      "template_suffix": "",
      "title": "Potion Notions",
      "url": "/blogs/potion-notions"
    }
          
          `,
        },
        {
          title: "blogs",
          url: "https://shopify.dev/docs/api/liquid/objects/blogs",
          keyword: ["objects"],
          category: "Objects",
          description: `All of the blogs in the store. \n\n You can use \`blogs\` to access a blog by its [handle](https://shopify.dev/docs/api/liquid/basics#handles).
          
    {% for article in blogs.potion-notions.articles %}
      {{- article.title | link_to: article.url }}
    {% endfor %}
          
          `,
        },
        {
          title: "brand",
          url: "https://shopify.dev/docs/api/liquid/objects/brand",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "colors", type: "" },
            { name: "cover_image", type: "image" },
            { name: "favicon_url", type: "image" },
            { name: "logo", type: "image" },
            { name: "metafields", type: "" },
            { name: "short_description", type: "string" },
            { name: "slogan", type: "string" },
            { name: "square_logo", type: "image" },
          ],
          description: `The [brand assets](https://help.shopify.com/manual/promoting-marketing/managing-brand-assets?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3) for the store. 

    {
      "colors": {},
      "cover_image": {},
      "favicon_url": {},
      "logo": {},
      "metafields": {},
      "short_description": "Canada's foremost retailer for potions and potion accessories. Try one of our award-winning artisanal potions, or find the supplies to make your own!",
      "slogan": "Save the toil and trouble!",
      "square_logo": {}
    }     
          
          `,
        },
        {
          title: "brand_color",
          url: "https://shopify.dev/docs/api/liquid/objects/brand_color",
          keyword: ["objects"],
          category: "Objects",
          description: `The colors defined as part of a store's [brand assets](https://help.shopify.com/manual/promoting-marketing/managing-brand-assets?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3). To access a brand color, specify the following: \n\n - The brand color group: either \`primary\` or \`secondary\` \n\n - The color role: Whether the color is a \`background\` or \`foreground\` (contrasting) color \n\n - The 0-based index of the color within the group and role

    \`\`\`
    {{ shop.brand.colors.primary[0].background }}
    {{ shop.brand.colors.primary[0].foreground }}
    {{ shop.brand.colors.secondary[0].background }}
    {{ shop.brand.colors.secondary[1].background }}
    {{ shop.brand.colors.secondary[0].foreground }}
    \`\`\`     
          `,
        },
        {
          title: "canonical_url",
          url: "https://shopify.dev/docs/api/liquid/objects/canonical_url",
          keyword: ["objects"],
          category: "Objects",
          description: `The canonical URL for the current page. To learn about canonical URLs, refer to [Google's documentation](https://support.google.com/webmasters/answer/139066?hl=en).`,
        },
        {
          title: "cart",
          url: "https://shopify.dev/docs/api/liquid/objects/cart",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "attributes", type: "-" },
            { name: "cart_level_discount_applications", type: "array of discount_application" },
            { name: "currency", type: "-" },
            { name: "discount_applications", type: "array of discount_application" },
            { name: "empty?", type: "boolean" },
            { name: "item_count", type: "number" },
            { name: "items", type: "array of line_item" },
            { name: "items_subtotal_price", type: "number" },
            { name: "note", type: "string" },
            { name: "original_total_price", type: "number" },
            { name: "requires_shipping", type: "boolean" },
            { name: "taxes_included", type: "boolean" },
            { name: "total_discount", type: "number" },
            { name: "total_price", type: "number" },
            { name: "total_weight", type: "number" },
          ],
          objectPropertiesDeprecated: [{ name: "discounts", type: "array of discount" }],
          description: `A customer’s cart.
          
    {
      "attributes": {},
      "cart_level_discount_applications": [],
      "checkout_charge_amount": "380.25",
      "currency": {},
      "discount_applications": [],
      "discounts": [],
      "empty?": false,
      "item_count": 2,
      "items": [],
      "items_subtotal_price": "422.49",
      "note": "Hello this is a note",
      "original_total_price": "424.99",
      "requires_shipping": true,
      "taxes_included": false,
      "total_discount": "44.74",
      "total_price": "380.25",
      "total_weight": 0
    }
          
          `,
        },
        {
          title: "checkout",
          url: "https://shopify.dev/docs/api/liquid/objects/checkout",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "applied_gift_cards", type: "array of gift_card" },
            { name: "attributes", type: "-" },
            { name: "billing_address", type: "address" },
            { name: "buyer_accepts_marketing", type: "boolean" },
            { name: "cart_level_discount_applications", type: "array of discount_application" },
            { name: "currency", type: "string" },
            { name: "customer", type: "customer" },
            { name: "discount_applications", type: "array of discount_application" },
            { name: "discounts_amount", type: "array of discount_application" },
            { name: "discounts_savings", type: "array of discount_application" },
            { name: "email", type: "string" },
            { name: "gift_cards_amount", type: "number" },
            { name: "id", type: "number" },
            { name: "item_count", type: "number" },
            { name: "line_items", type: "array of line_item" },
            { name: "line_items_subtotal_price", type: "number" },
            { name: "name", type: "string" },
            { name: "note", type: "string" },
            { name: "order", type: "order" },
            { name: "order_id", type: "string" },
            { name: "order_name", type: "string" },
            { name: "order_number", type: "string" },
            { name: "requires_shipping", type: "boolean" },
            { name: "shipping_address", type: "address" },
            { name: "shipping_method", type: "shipping_method" },
            { name: "shipping_price", type: "number" },
            { name: "tax_lines", type: "array of tax_line" },
            { name: "tax_price", type: "number" },
            { name: "total_price", type: "number" },
            { name: "transactions", type: "array of transaction" },
          ],
          objectPropertiesDeprecated: [
            { name: "cancelled", type: "boolean" },
            { name: "discount", type: "discount" },
            { name: "discounts", type: "array of discount" },
            { name: "financial_status", type: "string" },
            { name: "fulfilled_at", type: "string" },
            { name: "fulfilled_line_items", type: "array of line item" },
            { name: "fulfilled_status", type: "string" },
            { name: "unavailable_line_items", type: "array of line item" },
            { name: "unfulfilled_line_items", type: "array of line item" },
          ],
          description: `A customer's checkout. \n\n ## ⚠️ Deprecated \n\n The \`checkout\` object will be deprecated for the Information, Shipping, and Payment pages on August 13, 2024. Merchants who have customized these pages using \`checkout.liquid\` need to upgrade to Checkout Extensibility before August 13, 2024.
          
    {
      "applied_gift_cards": [],
      "attributes": {},
      "billing_address": {},
      "buyer_accepts_marketing": false,
      "cart_level_discount_applications": [],
      "currency": "CAD",
      "customer": {},
      "discount_applications": [],
      "discounts_amount": 4224,
      "discounts_savings": -4224,
      "email": "cornelius.potionmaker@gmail.com",
      "gift_cards_amount": 0,
      "id": 29944051400769,
      "line_items": [],
      "line_items_subtotal_price": 42249,
      "name": "#29944051400769",
      "note": null,
      "order": null,
      "order_id": null,
      "order_name": "#29944051400769",
      "order_number": "#29944051400769",
      "requires_shipping": true,
      "shipping_address": {},
      "shipping_method": {},
      "shipping_price": 0,
      "tax_lines": [],
      "tax_price": 0,
      "total_price": 38025,
      "transactions": []
    }
          
          
          `,
        },
        {
          title: "collection",
          url: "https://shopify.dev/docs/api/liquid/objects/collection",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "all_products_count", type: "number" },
            { name: "all_tags", type: "array of string" },
            { name: "all_types", type: "array of string" },
            { name: "all_vendors", type: "array of string" },
            { name: "current_type", type: "string" },
            { name: "current_vendor", type: "string" },
            { name: "default_sort_by", type: "string from a set of values" },
            { name: "description", type: "string" },
            { name: "featured_image", type: "image" },
            { name: "filters", type: "array of filter" },
            { name: "handle", type: "string" },
            { name: "id", type: "number" },
            { name: "image", type: "image" },
            { name: "metafields", type: "array of metafields" },
            { name: "next_product", type: "product" },
            { name: "previous_product", type: "product" },
            { name: "products", type: "product" },
            { name: "products_count", type: "number" },
            { name: "published_at", type: "string" },
            { name: "sort_by", type: "string" },
            { name: "sort_options", type: "array of sort option" },
            { name: "tags", type: "array of string" },
            { name: "template_suffix", type: "string" },
            { name: "title", type: "string" },
            { name: "url", type: "string" },
          ],
          description: `A [collection](https://help.shopify.com/manual/products/collections?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3) in a store. 
          
          
    {
      "all_products_count": 10,
      "all_tags": [
        "Burning",
        "dried",
        "extracts",
        "fresh",
        "ingredients",
        "plant",
        "supplies"
      ],
      "all_types": [
        "Animals & Pet Supplies",
        "Baking Flavors & Extracts",
        "Cooking & Baking Ingredients",
        "Dried Flowers",
        "Fruits & Vegetables",
        "Seasonings & Spices",
        "Water"
      ],
      "all_vendors": [
        "Clover's Apothecary",
        "Polina's Potent Potions",
        "Ted's Apothecary Supply"
      ],
      "current_type": null,
      "current_vendor": null,
      "default_sort_by": "created-ascending",
      "description": "Brew your own potions at home using our fresh, ethically-sourced ingredients.",
      "featured_image": {},
      "filters": {},
      "handle": "ingredients",
      "id": 266168401985,
      "image": {},
      "metafields": {},
      "next_product": null,
      "previous_product": null,
      "products": {},
      "products_count": 1,
      "published_at": "2022-04-19 09:52:18 -0400",
      "sort_by": "",
      "sort_options": [],
      "tags": [
        "Burning"
      ],
      "template_suffix": "eight-products-per-page",
      "title": "Ingredients",
      "url": {}
    }

          `,
        },
        {
          title: "collections",
          url: "https://shopify.dev/docs/api/liquid/objects/collections",
          keyword: ["objects"],
          category: "Objects",
          description: `All of the [collections](https://shopify.dev/docs/api/liquid/objects/collection) on a store.

    {% for collection in collections %}
      {{- collection.title | link_to: collection.url }}
    {% endfor %}
    \n
    {% for product in collections['sale-potions'].products %}
      {{- product.title | link_to: product.url }}
    {% endfor %}
          
          `,
        },
        {
          title: "color",
          url: "https://shopify.dev/docs/api/liquid/objects/color",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "alpha", type: "number" },
            { name: "blue", type: "number" },
            { name: "green", type: "number" },
            { name: "hue", type: "number" },
            { name: "lightness", type: "number" },
            { name: "red", type: "number" },
            { name: "rgb", type: "string" },
            { name: "rgba", type: "string" },
            { name: "saturation", type: "number" },
          ],
          description: `A color from a [color setting](https://shopify.dev/themes/architecture/settings/input-settings#color).
          
    {{ settings.colors_accent_2 }}
          `,
        },
        {
          title: "color_scheme",
          url: "https://shopify.dev/docs/api/liquid/objects/color_scheme",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "id", type: "string" },
            { name: "setting", type: "-" },
          ],
          description: `A \`color_scheme\` from a [color_scheme](https://shopify.dev/themes/architecture/settings/input-settings#color_scheme) setting.
          
      { settings.card_color_scheme }}   
          `,
        },
        {
          title: "color_scheme_group",
          url: "https://shopify.dev/docs/api/liquid/objects/color_scheme_group",
          keyword: ["objects"],
          category: "Objects",
          description: `A \`color_scheme_group\` from a [color_scheme_group setting](https://shopify.dev/themes/architecture/settings/input-settings#color_scheme_group).

    {% for scheme in settings.color_schemes %}
      .color-{{ scheme.id }} {
        --color-background: {{ scheme.settings.background }};
        --color-text: {{ scheme.settings.text }};
      }
    {% endfor %}     
          
          `,
        },
        {
          title: "comment",
          url: "https://shopify.dev/docs/api/liquid/objects/comment",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "author", type: "string" },
            { name: "content", type: "string" },
            { name: "created_at", type: "string" },
            { name: "email", type: "string" },
            { name: "id", type: "number" },
            { name: "status", type: "string" },
            { name: "updated_at", type: "string" },
            { name: "url", type: "string" },
          ],
          description: `An article comment.
          
          
    {
      "author": "Cornelius",
      "content": "Wow, this is going to save me a fortune in invisibility potion!",
      "created_at": "2022-06-05 19:33:57 -0400",
      "email": "cornelius.potionmaker@gmail.com",
      "id": 129089273921,
      "status": "published",
      "updated_at": "2022-06-05 19:33:57 -0400",
      "url": "/blogs/potion-notions/how-to-tell-if-you-have-run-out-of-invisibility-potion#129089273921"
    }
          `,
        },
        {
          title: "company",
          url: "https://shopify.dev/docs/api/liquid/objects/company",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "available_locations", type: "array of company_location" },
            { name: "id", type: "number" },
            { name: "metafields", type: "array of metafield" },
            { name: "name", type: "string" },
          ],
          description: `A company that a [customer](https://shopify.dev/docs/api/liquid/objects/customer) is purchasing for. To learn about B2B in themes, refer to [Support B2B customers in your theme](https://shopify.dev/themes/pricing-payments/b2b).

    {
      "available_locations": [],
      "id": 98369,
      "metafields": {},
      "name": "Cornelius' Custom Concoctions"
    }
          
          `,
        },
        {
          title: "company_address",
          url: "https://shopify.dev/docs/api/liquid/objects/company_address",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "address1", type: "string" },
            { name: "address2", type: "string" },
            { name: "attention", type: "string" },
            { name: "city", type: "string" },
            { name: "country", type: "country" },
            { name: "country_code", type: "string" },
            { name: "id", type: "number" },
            { name: "province", type: "string" },
            { name: "province_code", type: "string" },
            { name: "street", type: "string" },
            { name: "zip", type: "string" },
          ],
          description: `The address of a company location. To learn about B2B in themes, refer to [Support B2B customers in your theme](https://shopify.dev/themes/pricing-payments/b2b).
          
    {
      "address1": "99 Cauldron Lane",
      "address2": "Unit 4B",
      "attention": "Cornelius Potionmaker",
      "city": "Edinburgh",
      "country": {},
      "country_code": "GB",
      "id": 65,
      "province": null,
      "province_code": null,
      "street": "99 Cauldron Lane, Unit 4B",
      "zip": "EH95 1AF"
    } 
          
          `,
        },
        {
          title: "company_location",
          url: "https://shopify.dev/docs/api/liquid/objects/company_location",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "company", type: "company" },
            { name: "current?", type: "boolean" },
            { name: "id", type: "number" },
            { name: "metafields", type: "array of metafield" },
            { name: "name", type: "string" },
            { name: "shipping_address", type: "company_address" },
            { name: "tax_registration_id", type: "number" },
            { name: "url_to_set_as_current", type: "string" },
          ],
          description: `A location of the [company](https://shopify.dev/docs/api/liquid/objects/company) that a [customer](https://shopify.dev/docs/api/liquid/objects/customer) is purchasing for. To learn about B2B in themes, refer to [Support B2B customers in your theme](https://shopify.dev/themes/pricing-payments/b2b).
          
    {
      "company": {},
      "current?": false,
      "id": 98369,
      "metafields": {},
      "name": "99 Cauldron Lane",
      "shipping_address": {},
      "tax_registration_id": null,
      "url_to_set_as_current": "https://polinas-potent-potions.myshopify.com/company_location/update?location_id=98369&return_to=/resource"
    }
          
          
          `,
        },
        {
          title: "content_for_additional_checkout_buttons",
          url: "https://shopify.dev/docs/api/liquid/objects/content_for_additional_checkout_buttons",
          keyword: ["objects"],
          category: "Objects",
          description: `Returns checkout buttons for any active payment providers with offsite checkouts. \n\n Use [additional_checkout_buttons](https://shopify.dev/docs/api/liquid/objects/additional_checkout_buttons) to check whether these payment providers exist, and \`content_for_additional_checkout_buttons\` to show the associated checkout buttons. To learn more about how to use these objects, refer to [Accelerated checkout](https://shopify.dev/themes/pricing-payments/accelerated-checkout).
          
    {% if additional_checkout_buttons %}
      {{ content_for_additional_checkout_buttons }}
    {% endif %}
          
          `,
        },
        {
          title: "content_for_header",
          url: "https://shopify.dev/docs/api/liquid/objects/content_for_header",
          keyword: ["objects"],
          category: "Objects",
          description: `Dynamically returns all scripts required by Shopify. \n\n Include the \`content_for_header\` object in your [layout files](https://shopify.dev/themes/architecture/layouts) between the \`<head>\` and \`</head>\` HTML tags. \n\n You shouldn't try to modify or parse the content_for_header object because the contents are subject to change, which can change the behaviour of your code.`,
        },
        {
          title: "content_for_index",
          url: "https://shopify.dev/docs/api/liquid/objects/content_for_index",
          keyword: ["objects"],
          category: "Objects",
          description: `Dynamically returns the content of [sections](https://shopify.dev/themes/architecture/sections) to be rendered on the home page. If you use a [Liquid index template](https://shopify.dev/themes/architecture/templates/index-template) \`(templates/index.liquid)\`, then you must include \`{{ content_for_index }}\` in the template. This object can't be used in JSON index templates.`,
        },
        {
          title: "content_for_layout",
          url: "https://shopify.dev/docs/api/liquid/objects/content_for_layout",
          keyword: ["objects"],
          category: "Objects",
          description: `Dynamically returns content based on the current [template](https://shopify.dev/themes/architecture/templates). \n\n Include the \`content_for_layout\` object in your [layout files](https://shopify.dev/themes/architecture/layouts) between the \`<body>\` and \`</body>\` HTML tags.`,
        },
        {
          title: "country",
          url: "https://shopify.dev/docs/api/liquid/objects/country",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "available_languages", type: "array of shop_locales" },
            { name: "continent", type: "string" },
            { name: "currency", type: "currency" },
            { name: "iso_code", type: "string" },
            { name: "market", type: "market" },
            { name: "name", type: "string" },
            { name: "popular?", type: "boolean" },
            { name: "unit_system", type: "string from a set of values" },
          ],
          description: `A country supported by the store's localization options. \n\n To learn how to use the \`country\` object to offer localization options in your theme, refer to [Support multiple currencies and languages](https://shopify.dev/themes/internationalization/multiple-currencies-languages).
    

    {% for country in localization.available_countries -%}
      {{ country }}
    {%- endfor %}
    \n
    {
      "available_languages": [],
      "continent": "North America",
      "currency": {},
      "iso_code": "CA",
      "market": {},
      "name": "Canada",
      "popular?": false,
      "unit_system": "metric"
    }
          
          `,
        },
        {
          title: "country_option_tags",
          url: "https://shopify.dev/docs/api/liquid/objects/country_option_tags",
          keyword: ["objects"],
          category: "Objects",
          description: `Creates an \`<option>\` tag for each country and region that's included in a shipping zone on the [Shipping](https://www.shopify.com/admin/settings/shipping?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3) page of the Shopify admin. \n\n An attribute called \`data-provinces\` is set for each \`<option>\`, and contains a JSON-encoded array of the country or region's subregions. If a country doesn't have any subregions, then an empty array is set for its \`data-provinces\` attribute.
          
          
    <select name="country">
      {{ country_option_tags }}
    </select> 
          
          `,
        },
        {
          title: "currency",
          url: "https://shopify.dev/docs/api/liquid/objects/currency",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "iso_code", type: "string" },
            { name: "symbol", type: "string" },
            { name: "iso_code", type: "string" },
          ],
          description: `Information about a currency, like the ISO code and symbol.
          
    {
      "iso_code": "CAD",
      "name": "Canadian Dollar",
      "symbol": "$"
    }
          `,
        },
        {
          title: "current_page",
          url: "https://shopify.dev/docs/api/liquid/objects/current_page",
          keyword: ["objects"],
          category: "Objects",
          description: `The current page number. \n\n The \`current_page\` object has a value of 1 for non-paginated resources.
          
    {{ page_title }}
    {% unless current_page == 1 %} - Page
      {{ current_page }}
    {% endunless %}
          
          
          `,
        },
        {
          title: "current_tags",
          url: "https://shopify.dev/docs/api/liquid/objects/current_tags",
          keyword: ["objects"],
          category: "Objects",
          description: `The currently applied [tags](https://help.shopify.com/en/manual/shopify-admin/productivity-tools/using-tags?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3). \n\n You can add tags to articles and products. Article tags can be used to [filter a blog page](https://shopify.dev/themes/architecture/templates/blog#filter-articles-by-tag) to show only articles with specific tags. Similarly, product tags can be used to [filter a collection page](https://shopify.dev/themes/navigation-search/filtering/tag-filtering) to show only products with specific tags.`,
        },
        {
          title: "customer",
          url: "https://shopify.dev/docs/api/liquid/objects/customer",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "accepts_marketing", type: "boolean" },
            { name: "addresses", type: "array of address" },
            { name: "addresses_count", type: "number" },
            { name: "b2b?", type: "boolean" },
            { name: "company_available_locations", type: "array of company_location" },
            { name: "current_company", type: "company" },
            { name: "current_location", type: "company_location" },
            { name: "default_address", type: "address" },
            { name: "email", type: "string" },
            { name: "first_name", type: "string" },
            { name: "has_account", type: "boolean" },
            { name: "id", type: "number" },
            { name: "last_name", type: "string" },
            { name: "last_order_id", type: "order" },
            { name: "name", type: "string" },
            { name: "orders", type: "array of order" },
            { name: "orders_count", type: "number" },
            { name: "phone", type: "string" },
            { name: "tags", type: "array of string" },
            { name: "tax_exempt", type: "boolean" },
            { name: "total_spent", type: "number" },
          ],
          description: `A [customer](https://help.shopify.com/manual/customers?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3) of the store. \`The customer\` object is directly accessible globally when a customer is logged in to their account. It's also defined in the following contexts: \n\n - The [customers/account template
](https://shopify.dev/themes/architecture/templates/customers-account) \n\n - The [customers/address template
](https://shopify.dev/themes/architecture/templates/customers-addresses) \n\n - The [customers/order template](https://shopify.dev/themes/architecture/templates/customers-order) \n\n - When accessing [checkout.customer](https://shopify.dev/docs/api/liquid/objects/checkout#checkout-customer) \n\n - When accessing [gift_card.customer](https://shopify.dev/docs/api/liquid/objects/gift_card#gift_card-customer)\n\n - When accessing [order.customer](https://shopify.dev/docs/api/liquid/objects/order#order-customer) \n\n Outside of the above contexts, if the customer isn't logged into their account, the \`customer\` object returns nil.
          
    {% if customer %}
      Hello, {{ customer.first_name }}!
    {% endif %}
          `,
        },
        {
          title: "discount",
          url: "https://shopify.dev/docs/api/liquid/objects/discount",
          keyword: ["objects", "deprecated"],
          isDeprecated: true,
          objectProperties: [
            { name: "amount", type: "number" },
            { name: "code", type: "string" },
            { name: "saving", type: "number" },
            { name: "title", type: "string" },
            { name: "total_amount", type: "number" },
            { name: "total_savings", type: "string" },
            { name: "type", type: "string from a set of values" },
          ],
          category: "Objects",
          description: `A discount applied to a cart, line item, or order. \n\n Deprecated because not all discount types and details are captured. The \`discount\` object has been replaced by the \`discount_allocation\` and \`discount_application\` objects.
          
    {
      "amount": "40.00",
      "code": "DIY",
      "savings": "-40.00",
      "title": "DIY",
      "total_amount": "40.00",
      "total_savings": "-40.00",
      "type": "PercentageDiscount"
    }

          `,
        },
        {
          title: "discount_allocation",
          url: "https://shopify.dev/docs/api/liquid/objects/discount_allocation",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "amount", type: "number" },
            { name: "discount_application", type: "discount_application" },
          ],
          description: `Information about how a discount affects an item. \n\n To learn about how to display discounts in your theme, refer to [Discounts](https://shopify.dev/themes/pricing-payments/discounts).
          
    {
      "amount": "40.00",
      "discount_application": "DiscountApplicationDrop"
    } 
          
          `,
        },
        {
          title: "discount_application",
          url: "https://shopify.dev/docs/api/liquid/objects/discount_application",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "target_selection", type: "string from a set of values" },
            { name: "target_type", type: "string from a set of values" },
            { name: "title", type: "sstring" },
            { name: "total_allocated_amount", type: "number" },
            { name: "type", type: "string from a set of values" },
            { name: "value", type: "number" },
            { name: "value_type", type: "string from a set of values" },
          ],
          description: `Information about the intent of a discount. To learn about how to display discounts in your theme, refer to [Discounts](https://shopify.dev/themes/pricing-payments/discounts).
          
    {
      "target_selection": "explicit",
      "target_type": "line_item",
      "title": "Bloodroot discount!",
      "total_allocated_amount": "2.50",
      "type": "script",
      "value": "2.5",
      "value_type": "fixed_amount"
    }
          
          `,
        },
        {
          title: "external_video",
          url: "https://shopify.dev/docs/api/liquid/objects/external_video",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "alt", type: "string" },
            { name: "aspect_ratio", type: "number" },
            { name: "external_id", type: "string" },
            { name: "host", type: "string from a set of values" },
            { name: "id", type: "number" },
            { name: "media_type", type: "string" },
            { name: "position", type: "number" },
            { name: "preview_image", type: "image" },
          ],
          description: `Information about an external video from YouTube or Vimeo.
          
    {
      "alt": "Potion beats",
      "aspect_ratio": "1.77",
      "external_id": "vj01PAffOac",
      "host": "youtube",
      "id": 22015756402753,
      "media_type": "external_video",
      "position": 1,
      "preview_image": {}
    }
          
          `,
        },
        {
          title: "filter",
          url: "https://shopify.dev/docs/api/liquid/objects/filter",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "active_values", type: "array of filter_value" },
            { name: "false_value", type: "filter_value" },
            { name: "inactive_values", type: "array of filter_value" },
            { name: "label", type: "string" },
            { name: "max_value", type: "filter_value" },
            { name: "min_value", type: "filter_value" },
            { name: "operator", type: "string from a set of values" },
            { name: "param_name", type: "string" },
            { name: "presentation", type: "string from a set of values" },
            { name: "range_max", type: "number" },
            { name: "true_value", type: "filter_value" },
            { name: "type", type: "string from a set values" },
            { name: "url_to_remove", type: "string" },
            { name: "values", type: "array of filter_value" },
          ],
          description: `A [storefront filter](https://help.shopify.com/manual/online-store/themes/customizing-themes/storefront-filters?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3). To learn about supporting filters in your theme, refer to [Support storefront filtering](https://shopify.dev/themes/navigation-search/filtering/storefront-filtering/support-storefront-filtering).
          
    {
      "active_values": [],
      "inactive_values": [],
      "label": "Strength",
      "operator": "OR",
      "param_name": "filter.v.option.strength",
      "presentation": "text",
      "type": "list",
      "url_to_remove": "/resource?q=potion",
      "values": []
    }
          `,
        },
        {
          title: "filter_value",
          url: "https://shopify.dev/docs/api/liquid/objects/filter_value",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "active", type: "boolean" },
            { name: "count", type: "number" },
            { name: "display", type: "filter of value_display" },
            { name: "label", type: "string" },
            { name: "param_name", type: "string" },
            { name: "url_to_add", type: "string" },
            { name: "url_to_remove", type: "string" },
            { name: "value", type: "string" },
          ],
          description: `A specific value of a filter. To learn about supporting filters in your theme, refer to [Support storefront filtering](https://shopify.dev/themes/navigation-search/filtering/storefront-filtering/support-storefront-filtering). \n\n 
          
    {
      "active": false,
      "count": 1,
      "display": null,
      "label": "High",
      "param_name": "filter.v.option.strength",
      "url_to_add": "/resource?filter.v.option.strength=High&q=potion",
      "url_to_remove": "/resource?q=potion",
      "value": "High"
    } 
          
          
          `,
        },
        {
          title: "filter_value_display",
          url: "https://shopify.dev/docs/api/liquid/objects/filter_value_display",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "type", type: "string from a set of values" },
            { name: "value", type: "-" },
          ],
          description: `The visual representation of a filter value.`,
        },
        {
          title: "focal_point",
          url: "https://shopify.dev/docs/api/liquid/objects/focal_point",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "x", type: "number" },
            { name: "y", type: "number" },
          ],
          description: `The focal point for an image. \n\n The focal point will remain visible when the image is cropped by the theme. [Learn more about supporting focal points in your theme](https://shopify.dev/themes/architecture/settings/input-settings#image-focal-points).

    {{ images['potions-header.png'].presentation.focal_point }}
          `,
        },
        {
          title: "font",
          url: "https://shopify.dev/docs/api/liquid/objects/font",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "baseline_ratio", type: "number" },
            { name: "fallback_families", type: "string" },
            { name: "family", type: "string" },
            { name: "style", type: "string" },
            { name: "system?", type: "boolean" },
            { name: "variants", type: "array of font" },
            { name: "weight", type: "number" },
          ],
          description: `A font from a [font_picker setting](https://shopify.dev/themes/architecture/settings/input-settings#font_picker). You can use the \`font\` object in Liquid [assets](https://shopify.dev/themes/architecture#assets) or inside a [style tag](https://shopify.dev/docs/api/liquid/tags/style) to apply font setting values to theme CSS.
          
    {
      "baseline_ratio": 0.133,
      "fallback_families": "sans-serif",
      "family": "Assistant",
      "style": "normal",
      "system?": false,
      "variants": {},
      "weight": "400"
    }
  
          `,
        },
        {
          title: "forloop",
          url: "https://shopify.dev/docs/api/liquid/objects/forloop",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "first?", type: "boolean" },
            { name: "index", type: "number" },
            { name: "index0", type: "number" },
            { name: "last?", type: "boolean" },
            { name: "length", type: "number" },
            { name: "parentloop", type: "forloop" },
            { name: "rindex", type: "number" },
            { name: "rindex0", type: "number" },
          ],
          description: `Information about a parent [for loop](https://shopify.dev/docs/api/liquid/tags/for).
          
    {% for page in pages -%}
      {%- if forloop.length > 0 -%}
        {{ page.title }}{% unless forloop.last %}, {% endunless -%}
      {%- endif -%}
    {% endfor %}

`,
        },
        {
          title: "form",
          url: "https://shopify.dev/docs/api/liquid/objects/form",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "address1", type: "string" },
            { name: "address2", type: "string" },
            { name: "author", type: "string" },
            { name: "body", type: "string" },
            { name: "city", type: "string" },
            { name: "company", type: "string" },
            { name: "country", type: "string" },
            { name: "email", type: "string" },
            { name: "errors", type: "form_errors" },
            { name: "first_name", type: "string" },
            { name: "id", type: "string" },
            { name: "last_name", type: "string" },
            { name: "message", type: "string" },
            { name: "name", type: "string" },
            { name: "password_needed", type: "string" },
            { name: "phone", type: "string" },
            { name: "posted_successfully?", type: "boolean" },
            { name: "province", type: "string" },
            { name: "set_as_default_checkbox", type: "string" },
            { name: "zip", type: "string" },
          ],
          description: `Information about a form created by a [form tag](https://shopify.dev/docs/api/liquid/tags/form).

    {
      "address1": "12 Phoenix Feather Alley",
      "address2": "1",
      "author": null,
      "body": null,
      "city": "Calgary",
      "company": null,
      "country": "Canada",
      "email": null,
      "errors": null,
      "first_name": "Cornelius",
      "id": "new",
      "last_name": "Potionmaker",
      "password_needed?": false,
      "phone": "44 131 496 0905",
      "posted_successfully?": true,
      "province": "Alberta",
      "set_as_default_checkbox": "<input type='checkbox' id='address_default_address_new' name='address[default]' value='1'>",
      "zip": "T1X 0L4"
    }
          `,
        },
        {
          title: "form_errors",
          url: "https://shopify.dev/docs/api/liquid/objects/form_errors",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "messages", type: "array of string" },
            { name: "translated_fields", type: "array of string" },
          ],
          description: `The error category strings for errors from a form created by a [form tag](https://shopify.dev/docs/api/liquid/tags/form). The following table outlines the strings that can be returned and the reason that they would be: \n\n - \`author\` There were issues with required name fields. \n\n - \`body\` 	There were issues with required text content fields. \n\n - \`email\` There were issues with required email fields. \n\n - \`form\` There were general issues with the form. \n\n - \`password\` There were issues with required password fields.`,
        },
        {
          title: "fulfillment",
          url: "https://shopify.dev/docs/api/liquid/objects/fulfillment",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "created_at", type: "string" },
            { name: "fulfillment_line_items", type: "array of line_items" },
            { name: "item_count", type: "number" },
            { name: "tracking_company", type: "string" },
            { name: "tracking_number", type: "array of string" },
            { name: "tracking_url", type: "string" },
          ],
          description: `An order [fulfillment](https://help.shopify.com/manual/orders/fulfillment?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3), which includes information like the line items being fulfilled and shipment tracking.
          
    {
      "created_at": "2022-06-15 17:08:30 -0400",
      "fulfillment_line_items": [
        {
          "quantity": 2,
          "line_item": "LineItemDrop"
        },
        {
          "quantity": 1,
          "line_item": "LineItemDrop"
        }
      ],
      "item_count": 3,
      "tracking_company": "Canada Post",
      "tracking_number": "01189998819991197253",
      "tracking_numbers": [
        "01189998819991197253"
      ],
      "tracking_url": "https://www.canadapost.ca/track-reperage/en#/search?searchFor=01189998819991197253"
    }
          
          `,
        },
        {
          title: "generic_file",
          url: "https://shopify.dev/docs/api/liquid/objects/generic_file",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "alt", type: "string" },
            { name: "id", type: "number" },
            { name: "media_type", type: "string" },
            { name: "position", type: "number" },
            { name: "preview_image", type: "image" },
            { name: "url", type: "string" },
          ],
          description: `A file from a file_reference type [metafield](https://shopify.dev/docs/api/liquid/objects/metafield) that is neither an image or video.
          
    {
      "alt": null,
      "id": 21918386454593,
      "media_type": "generic_file",
      "position": null,
      "preview_image": {},
      "url": "//polinas-potent-potions.myshopify.com/cdn/shop/files/disclaimer.pdf?v=9043651738044769859"
    }  
          
          `,
        },
        {
          title: "gift_card",
          url: "https://shopify.dev/docs/api/liquid/objects/gift_card",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "balance", type: "number" },
            { name: "code", type: "string" },
            { name: "currency", type: "string" },
            { name: "customer", type: "customer" },
            { name: "enabled", type: "boolean" },
            { name: "expired", type: "boolean" },
            { name: "expires_on", type: "string" },
            { name: "initial_value", type: "number" },
            { name: "last_four_characters", type: "string" },
            { name: "message", type: "string" },
            { name: "pass_url", type: "string" },
            { name: "product", type: "product" },
            { name: "properties", type: "-" },
            { name: "qr_identifier", type: "string" },
            { name: "recipient", type: "recipient" },
            { name: "send_on", type: "string" },
            { name: "template_suffix", type: "string" },
            { name: "url", type: "string" },
          ],
          description: `A [gift card](https://help.shopify.com/manual/products/gift-card-products?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3) that's been issued to a customer or a recipient.
          
    {
      "balance": 5000,
      "code": "WCGX 7X97 K9HJ DFR8",
      "currency": "CAD",
      "customer": {},
      "enabled": true,
      "expired": false,
      "expires_on": null,
      "initial_value": 5000,
      "last_four_characters": "DFR8",
      "message": null,
      "send_on": null,
      "pass_url": "https://polinas-potent-potions.myshopify.com/v1/passes/pass.com.shopify.giftcardnext/94af7fbe55d010130df8d8bc4a338d36/",
      "product": {},
      "properties": {},
      "qr_identifier": "shopify-giftcard-v1-3TKWJKJBM3X7PBRK",
      "recipient": null,
      "template_suffix": null,
      "url": "https://checkout.shopify.com/gift_cards/56174706753/0011c591fc720d0a51b80cdb694f969e"
    }
          
          `,
        },
        {
          title: "group",
          url: "https://shopify.dev/docs/api/liquid/objects/group",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "rules", type: "array of rule" },
            { name: "sitemap", type: "sitemap" },
            { name: "user_agent", type: "user_agent" },
          ],
          description: `A group of rules for the \`robots.txt\` file.
          
    {
      "rules": [],
      "sitemap": {},
      "user_agent": {}
    }

          `,
        },
        {
          title: "handle",
          url: "https://shopify.dev/docs/api/liquid/objects/handle",
          keyword: ["objects"],
          category: "Objects",
          description: `The [handle](https://shopify.dev/docs/api/liquid/basics#handles) of the resource associated with the current template. The handle object will return a value only when the following \`templates\` are being viewed: \n\n - [article](https://shopify.dev/themes/architecture/templates/article) \n\n - [blog](https://shopify.dev/themes/architecture/templates/blog) \n\n - [collection](https://shopify.dev/themes/architecture/templates/collection) \n\n - [page](https://shopify.dev/themes/architecture/templates/page) \n\n - [product](https://shopify.dev/themes/architecture/templates/product) \n\n If none of the above templates are being viewed, then \`nil\` is returned.`,
        },
        {
          title: "image",
          url: "https://shopify.dev/docs/api/liquid/objects/image",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "alt", type: "string" },
            { name: "aspect_ratio", type: "number" },
            { name: "attached_to_variant?", type: "boolean" },
            { name: "height", type: "number" },
            { name: "id", type: "number" },
            { name: "media_type", type: "string" },
            { name: "postion", type: "number" },
            { name: "presentation", type: "image_presentation" },
            { name: "preview_image", type: "image" },
            { name: "product_id", type: "number" },
            { name: "src", type: "string" },
            { name: "variants", type: "array of variant" },
            { name: "width", type: "number" },
          ],
          description: `An image, such as a product or collection image. To learn about the image formats that Shopify supports, visit the [Shopify Help Center](https://help.shopify.com/manual/online-store/images/theme-images?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3#image-formats).
          
    {{ product.featured_image }}

    {
      "alt": "Charcoal",
      "aspect_ratio": 1.50016818028927,
      "attached_to_variant?": false,
      "height": 2973,
      "id": 29355706875969,
      "position": 1,
      "product_id": 6790277595201,
      "src": {},
      "variants": [],
      "width": 4460
    }
          `,
        },
        {
          title: "image_presentation",
          url: "https://shopify.dev/docs/api/liquid/objects/image_presentation",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [{ name: "focal_point", type: "focal_point" }],
          description: `The presentation settings for an image.`,
        },
        {
          title: "images",
          url: "https://shopify.dev/docs/api/liquid/objects/images",
          keyword: ["objects"],
          category: "Objects",
          description: `All of the [images](https://shopify.dev/docs/api/liquid/objects/image) that have been [uploaded](https://help.shopify.com/manual/online-store/images/theme-images?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3#upload-images) to a store. You can access images from the images array by their filename.

    {{ images['potions-header.png'] | image_url: width: 300 | image_tag }}

        `,
        },
        {
          title: "line_item",
          url: "https://shopify.dev/docs/api/liquid/objects/line_item",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "discount_allocations", type: "array of discount_allocation" },
            { name: "final_line_price", type: "number" },
            { name: "final_price", type: "number" },
            { name: "fulfillment", type: "fulfillment" },
            { name: "fulfillment_service", type: "string" },
            { name: "gift_card", type: "boolean" },
            { name: "grams", type: "number" },
            { name: "id", type: "number" },
            { name: "image", type: "image" },
            { name: "item_components", type: "array of line_item" },
            { name: "key", type: "string" },
            { name: "line_level_discount_allocations", type: "array of discount_allocation" },
            { name: "line_level_total_discount", type: "number" },
            { name: "message", type: "string" },
            { name: "options_with_values", type: "-" },
            { name: "original_line_price", type: "number" },
            { name: "original_price", type: "number" },
            { name: "product", type: "product" },
            { name: "product_id", type: "number" },
            { name: "properties", type: "-" },
            { name: "quantity", type: "number" },
            { name: "requires_shipping", type: "boolean" },
            { name: "selling_plan_allocation", type: "selling_plan_allocation" },
            { name: "sku", type: "sku" },
            { name: "successfully_fulfilled_quantity", type: "number" },
            { name: "tax_lines", type: "array of tax_line" },
            { name: "taxable", type: "boolean" },
            { name: "title", type: "string" },
            { name: "unit_price", type: "number" },
            { name: "unit_price_measurement", type: "unit_price_measurement" },
            { name: "url", type: "string" },
            { name: "url_to_remove", type: "string" },
            { name: "variant", type: "variant" },
            { name: "variant_id", type: "number" },
            { name: "vendor", type: "string" },
          ],
          objectPropertiesDeprecated: [
            { name: "discounts", type: "array of discount" },
            { name: "line_price", type: "number" },
            { name: "price", type: "number" },
            { name: "total_discount", type: "number" },
          ],
          description: `A line in a cart, checkout, or order. Each line item represents a product variant.
          
    {
      "discount_allocations": [],
      "discounts": [],
      "final_line_price": "74.97",
      "final_price": "24.99",
      "fulfillment": {},
      "fulfillment_service": "manual",
      "gift_card": false,
      "grams": 0,
      "id": 10974183882817,
      "image": {},
      "item_components": null,
      "key": 10974183882817,
      "line_level_discount_allocations": [],
      "line_level_total_discount": "0.00",
      "line_price": "74.97",
      "message": "",
      "options_with_values": [
        {
          "name": "Title",
          "value": "Default Title"
        }
      ],
      "original_line_price": "74.97",
      "original_price": "24.99",
      "price": "24.99",
      "product": {},
      "product_id": 6792596455489,
      "properties": {},
      "quantity": 3,
      "requires_shipping": true,
      "selling_plan_allocation": null,
      "sku": "",
      "successfully_fulfilled_quantity": 2,
      "tax_lines": [],
      "taxable": true,
      "title": "Bloodroot (whole)",
      "total_discount": "0.00",
      "unit_price": "49.98",
      "unit_price_measurement": {
        "measured_type": "weight",
        "quantity_value": "500.0",
        "quantity_unit": "g",
        "reference_value": 1,
        "reference_unit": "kg"
      },
      "url": {},
      "url_to_remove": null,
      "variant": {},
      "variant_id": 39888235757633,
      "vendor": "Clover's Apothecary"
    }
          
          `,
        },
        {
          title: "link",
          url: "https://shopify.dev/docs/api/liquid/objects/link",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "active", type: "boolean" },
            { name: "child_active", type: "boolean" },
            { name: "child_current", type: "boolean" },
            { name: "current", type: "boolean" },
            { name: "handle", type: "string" },
            { name: "levels", type: "number" },
            { name: "links", type: "array of link" },
            { name: "object", type: "-" },
            { name: "title", type: "string" },
            { name: "type", type: "string from a set of values" },
            { name: "url", type: "string" },
          ],
          description: `A link in a [menu](https://help.shopify.com/manual/online-store/menus-and-links/drop-down-menus?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3). To learn about how to implement navigation in a theme, refer to [Add navigation to your theme](https://shopify.dev/themes/navigation-search/navigation).
          
    {
      "active": false,
      "child_active": false,
      "child_current": false,
      "current": false,
      "handle": {},
      "levels": 0,
      "links": [],
      "object": {},
      "title": {},
      "type": "page_link",
      "url": "/pages/contact"
    }
          
          `,
        },
        {
          title: "linklist",
          url: "https://shopify.dev/docs/api/liquid/objects/linklist",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "handle", type: "string" },
            { name: "levels", type: "number" },
            { name: "links", type: "array of link" },
            { name: "title", type: "string" },
          ],
          description: `A [menu](https://help.shopify.com/manual/online-store/menus-and-links/drop-down-menus?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3) in a store. To learn about how to implement navigation in a theme, refer to [Add navigation to your theme](https://shopify.dev/themes/navigation-search/navigation).

    {
      "handle": "main-menu",
      "levels": 2,
      "links": [],
      "title": "Main menu"
    }  
          
          `,
        },
        {
          title: "linklists",
          url: "https://shopify.dev/docs/api/liquid/objects/linklists",
          keyword: ["objects"],
          category: "Objects",
          description: `All of the [menus](https://help.shopify.com/manual/online-store/menus-and-links/drop-down-menus?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3) in a store. You can access a specific menu through the linklists object using the menu's [handle](https://shopify.dev/docs/api/liquid/basics#handles).
          
    <!-- Main menu -->
    {% for link in linklists.main-menu.links -%}
      {{ link.title | link_to: link.url }}
    {%- endfor %}

    <!-- Footer menu -->
    {% for link in linklists['footer'].links -%}
      {{ link.title | link_to: link.url }}
    {%- endfor %}  
          
          
          `,
        },
        {
          title: "localization",
          url: "https://shopify.dev/docs/api/liquid/objects/localization",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "available_countries", type: "array of country" },
            { name: "available_languages", type: "array of shop_locale" },
            { name: "country", type: "country" },
            { name: "language", type: "shop_locale" },
            { name: "market", type: "market" },
          ],
          description: `Information about the countries and languages that are available on a store. The [localization](https://shopify.dev/docs/api/liquid/tags/form#form-localization) object can be used in a localization form. To learn about how to offer localization options in your theme, refer to [Support multiple currencies and languages](https://shopify.dev/themes/internationalization/multiple-currencies-languages).
          
    {
      "available_countries": [],
      "available_languages": [],
      "country": {},
      "language": {},
      "market": {}
    }
          
          `,
        },
        {
          title: "location",
          url: "https://shopify.dev/docs/api/liquid/objects/location",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "address", type: "address" },
            { name: "id", type: "address" },
            { name: "latitude", type: "address" },
            { name: "longitude", type: "address" },
            { name: "metefields", type: "-" },
            { name: "name", type: "string" },
          ],
          description: `A store [location](https://help.shopify.com/manual/locations?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3).
          
    {
      "address": {},
      "id": 62002462785,
      "latitude": 43.6556377,
      "longitude": -79.38681079999999,
      "metafields": {},
      "name": "123 Edward Street"
    }
          
          `,
        },
        {
          title: "market",
          url: "https://shopify.dev/docs/api/liquid/objects/market",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "handle", type: "string" },
            { name: "id", type: "string" },
          ],
          description: `A group of one or more regions of the world that a merchant is targeting for sales. \n\n To learn more about markets, refer to [Shopify Markets](https://shopify.dev/docs/apps/markets). To make sure that visitors interact with the optimal version of a store using Shopify Markets, refer to [Detect and set a visitor's optimal localization](https://shopify.dev/docs/themes/markets/localization-discovery).
          
    {
      "handle": "ca",
      "id": 6157828161,
      "metafields": {}
    }
          
          `,
        },
        {
          title: "measurement",
          url: "https://shopify.dev/docs/api/liquid/objects/measurement",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "type", type: "string from a set of values" },
            { name: "unit", type: "string" },
            { name: "value", type: "string" },
          ],
          description: `A measurement from one of the following metafield types: \n\n - \`dimension\` \n\n - \`volume\` \n\n - \`weight\` \n\n
          
    \`\`\`      
    {
      "type": "volume",
      "unit": "mL",
      "value": "500.0"
    }
    \`\`\`
          
          `,
        },
        {
          title: "media",
          url: "https://shopify.dev/docs/api/liquid/objects/media",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "alt", type: "string" },
            { name: "id", type: "number" },
            { name: "media_type", type: "string from a set of values" },
            { name: "position", type: "number" },
            { name: "preview_image", type: "image" },
          ],
          description: `An abstract media object that can represent the following object types: \n\n - [image](https://shopify.dev/docs/api/liquid/objects/image) \n\n - [model](https://shopify.dev/docs/api/liquid/objects/model) \n\n - [video](https://shopify.dev/docs/api/liquid/objects/video) \n\n - [external_video](https://shopify.dev/docs/api/liquid/objects/external_video) \n\n The media object can be returned by the [product.media array](https://shopify.dev/docs/api/liquid/objects/product#product-media) or a [file_reference metafield](https://shopify.dev/apps/metafields/types). \n\n You can use [media filters](https://shopify.dev/docs/api/liquid/filters/media-filters) to generate URLs and media displays. To learn about how to use media in your theme, refer to [Support product media](https://shopify.dev/themes/product-merchandising/media/support-media).
          
    {
      "alt": "Dandelion milk",
      "id": 21772527435841,
      "media_type": "image",
      "position": 1,
      "preview_image": {}
    }     
          
          `,
        },
        {
          title: "metafield",
          url: "https://shopify.dev/docs/api/liquid/objects/metafield",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "list?", type: "boolean" },
            { name: "type", type: "string from a set of values" },
            { name: "value", type: "-" },
          ],
          description: `A [metafield](https://shopify.dev/apps/metafields) attached to a parent object. \n\n To learn about how to access a metafield on a specific object, refer to [Access metafields](https://shopify.dev/docs/api/liquid/objects/metafield#metafield-access-metafields). \n\n Metafields support [multiple data types](https://shopify.dev/apps/metafields/types), which determine the kind of information that's stored in the metafield. You can also output the metafield content in a type-specific format using [metafield filters](https://shopify.dev/docs/api/liquid/filters/metafield-filters).
          
          
    {{ resource.metafields.namespace.key }}

    {
      "list?": false,
      "type": "single_line_text_field",
      "value": "Take with a meal."
    }

          `,
        },
        {
          title: "metaobject",
          url: "https://shopify.dev/docs/api/liquid/objects/metaobject",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [{ name: "system", type: "metaobject_system" }],
          description: `A metaobject entry, which includes the values for a set of [fields](https://shopify.dev/docs/api/liquid/objects#metafield). The set is defined by the parent [metaobject_definition](https://shopify.dev/docs/api/liquid/objects#metaobject_definition).
          
    {{ shop.metaobjects.testimonials.homepage.title }}
    {{ shop.metaobjects['highlights']['washable'].image.value }}
          
          `,
        },
        {
          title: "metaobject_definition",
          url: "https://shopify.dev/docs/api/liquid/objects/metaobject_definition",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "values", type: "array of metaobject" },
            { name: "values_count", type: "number" },
          ],
          description: `A \`metaobject_definition\` defines the structure of a metaobject type for the store, which consists of a merchant-defined set of [field definitions](https://help.shopify.com/en/manual/metafields/metafield-definitions?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3). \n\n One or more corresponding metaobject objects contain values for the fields specified in the [metaobject](https://shopify.dev/docs/api/liquid/objects#metaobject) definition.

    {% for testimonial in shop.metaobjects.testimonials.values %}
      {{ testimonial.author.value }}
    {% endfor %}

        `,
        },
        {
          title: "metaobject_system",
          url: "https://shopify.dev/docs/api/liquid/objects/metaobject_system",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "handle", type: "string" },
            { name: "id", type: "number" },
            { name: "type", type: "string" },
            { name: "url", type: "string" },
          ],
          description: `Basic information about a [metaobject](https://shopify.dev/api/liquid/objects#metaobject). These properties are grouped under the system object to avoid collisions between system property names and user-defined metaobject fields.
          
    {% for metaobject in product.metafields.custom.mixed_metaobject_list.value %}
      {% if metaobject.system.type == "testimonial" %}
        {% render 'testimonial' with metaobject as testimonial %}
      {% else %}
        {{ metaobject.system.handle }}
      {% endif %}
    {% endfor %}
          
          `,
        },
        {
          title: "model",
          url: "https://shopify.dev/docs/api/liquid/objects/model",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "alt", type: "string" },
            { name: "id", type: "number" },
            { name: "media_type", type: "string" },
            { name: "position", type: "number" },
            { name: "preview_image", type: "image" },
            { name: "sources", type: "array of model_source" },
          ],
          description: `A 3D model uploaded as product media.
          
    {
      "alt": "Potion bottle",
      "id": 22064203137089,
      "media_type": "model",
      "position": 1,
      "preview_image": {},
      "sources": []
    }
          
          `,
        },
        {
          title: "model_source",
          url: "https://shopify.dev/docs/api/liquid/objects/model_source",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "format", type: "string" },
            { name: "mime_type", type: "string" },
            { name: "url", type: "string" },
          ],
          description: `A model source file.
          
    {
      "format": "glb",
      "mime_type": "model/gltf-binary",
      "url": "https://cdn.shopify.com/3d/models/o/eb9388299ce0557c/WaterBottle.glb"
    }
          
          `,
        },
        {
          title: "money",
          url: "https://shopify.dev/docs/api/liquid/objects/money",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [{ name: "currency", type: "currency" }],
          description: `A money value, in the the customer's local (presentment) currency.
          
    {{ product.metafields.details.price_per_100g.value }}
          `,
        },
        {
          title: "order",
          url: "https://shopify.dev/docs/api/liquid/objects/order",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "attributes", type: "-" },
            { name: "billing_address", type: "address" },
            { name: "cancel_reason", type: "string from a set of values" },
            { name: "cancel_reason_label", type: "string" },
            { name: "cancelled", type: "boolean" },
            { name: "cancelled_at", type: "string" },
            { name: "cart_level_discount_applications", type: "array of discount_application" },
            { name: "confirmation_number", type: "string" },
            { name: "created_at", type: "string" },
            { name: "customer", type: "customer" },
            { name: "customer_order_url", type: "string" },
            { name: "customer_url", type: "string" },
            { name: "discount_applications", type: "array of discount_application" },
            { name: "email", type: "string" },
            { name: "financial_status", type: "string from a set of values" },
            { name: "financial_status_label", type: "" },
            { name: "fulfillment_status", type: "string" },
            { name: "fulfillment_status_label", type: "string from a set of values" },
            { name: "id", type: "string" },
            { name: "item_count", type: "number" },
            { name: "line_items", type: "array of line_item" },
            { name: "line_items_subtotal_price", type: "number" },
            { name: "metafields", type: "-" },
            { name: "name", type: "string" },
            { name: "note", type: "string" },
            { name: "order_number", type: "number" },
            { name: "order_status_url", type: "string" },
            { name: "phone", type: "string" },
            { name: "pickup_in_store?", type: "boolean" },
            { name: "shipping_address", type: "address" },
            { name: "shipping_methods", type: "array of shipping_method" },
            { name: "shipping_price", type: "number" },
            { name: "subtotal_line_items", type: "array of line_item" },
            { name: "subtotal_price", type: "number" },
            { name: "tags", type: "array of string" },
            { name: "tax_lines", type: "array of tax_line" },
            { name: "tax_price", type: "number" },
            { name: "total_discounts", type: "number" },
            { name: "total_duties", type: "number" },
            { name: "total_net_amount", type: "number" },
            { name: "total_price", type: "number" },
            { name: "total_refunded_amount", type: "number" },
            { name: "transactions", type: "array of transaction" },
          ],
          objectPropertiesDeprecated: [{ name: "discounts", type: "discount" }],
          description: `An [order](https://help.shopify.com/manual/orders?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3).
          
    {
      "attributes": {},
      "billing_address": {},
      "cancel_reason": null,
      "cancel_reason_label": null,
      "cancelled": false,
      "cancelled_at": null,
      "cart_level_discount_applications": [],
      "confirmation_number": "0YMJHPM8U",
      "created_at": "2022-04-29 11:15:46 -0400",
      "customer": {},
      "customer_order_url": "https://shopify.com/56174706753/account/orders/4295688749121?locale=en",
      "customer_url": "https://polinas-potent-potions.myshopify.com/account/orders/8be02e56c658bcd1f034d28c496fddd9",
      "discount_applications": [],
      "discounts": null,
      "email": "cornelius.potionmaker@gmail.com",
      "financial_status": "paid",
      "financial_status_label": "Paid",
      "fulfillment_status": "partial",
      "fulfillment_status_label": "Partial",
      "id": 4295688749121,
      "item_count": 6,
      "line_items": [],
      "line_items_subtotal_price": "492.93",
      "metafields": {},
      "name": "#1001",
      "note": null,
      "order_number": 1001,
      "order_status_url": "https://polinas-potent-potions.myshopify.com/56174706753/orders/8be02e56c658bcd1f034d28c496fddd9/authenticate?key=4f9baf2b8ebd0f75ec73eb9bac6e4519",
      "phone": null,
      "pickup_in_store?": false,
      "shipping_address": {},
      "shipping_methods": [],
      "shipping_price": "0.00",
      "subtotal_line_items": [],
      "subtotal_price": "492.93",
      "tags": [],
      "tax_lines": [],
      "tax_price": "0.00",
      "total_discounts": "0.00",
      "total_duties": null,
      "total_net_amount": "492.93",
      "total_price": "492.93",
      "total_refunded_amount": "0.00",
      "transactions": []
    }
          
          `,
        },
        {
          title: "page",
          url: "https://shopify.dev/docs/api/liquid/objects/page",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "author", type: "string" },
            { name: "content", type: "string" },
            { name: "handle", type: "string" },
            { name: "id", type: "number" },
            { name: "metafields", type: "-" },
            { name: "published_at", type: "string" },
            { name: "template_suffix", type: "string" },
            { name: "title", type: "string" },
            { name: "url", type: "string" },
          ],
          description: `A [page](page) on a store.
          
    {
      "author": null,
      "content": "<p>Polina's Potent Potions was started by Polina in 1654.</p>\n<p>We use all-natural locally sourced ingredients for our potions.</p>",
      "handle": "about-us",
      "id": 83536642113,
      "metafields": {},
      "published_at": "2022-05-04 17:47:03 -0400",
      "template_suffix": "",
      "title": "About us",
      "url": {}
    }
          
          `,
        },
        {
          title: "page_description",
          url: "https://shopify.dev/docs/api/liquid/objects/page_description",
          keyword: ["objects"],
          category: "Objects",
          description: `The meta description of the current page. \n\n The page_description object can be used to provide a brief description of a page for search engine listings and social media previews. \n\n To learn about where to edit the meta description for a page, visit the [Shopify Help Center](https://help.shopify.com/manual/promoting-marketing/seo/adding-keywords?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3#edit-the-title-and-meta-description-for-a-page).`,
        },
        {
          title: "page_image",
          url: "https://shopify.dev/docs/api/liquid/objects/page_image",
          keyword: ["objects"],
          category: "Objects",
          description: `An image to be shown in search engine listings and social media previews for the current page. \n\n The resource's featured image for product and collection pages, and blog posts, is used. For all other pages, or pages where there's no featured image, the s[ocial sharing image](https://help.shopify.com/manual/online-store/images/showing-social-media-thumbnail-images?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3#setting-the-social-sharing-image-in-your-admin) is used.`,
        },
        {
          title: "page_title",
          url: "https://shopify.dev/docs/api/liquid/objects/page_title",
          keyword: ["objects"],
          category: "Objects",
          description: `The page title of the current page. \n\n The page_title object can be used to specify the title of page for search engine listings and social media previews. \n\n To learn about where to edit the title for a page, visit the [Shopify Help Center](https://help.shopify.com/manual/promoting-marketing/seo/adding-keywords?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3#edit-the-title-and-meta-description-for-a-page).`,
        },
        {
          title: "pages",
          url: "https://shopify.dev/docs/api/liquid/objects/pages",
          keyword: ["objects"],
          category: "Objects",
          description: `All of the [pages](https://shopify.dev/docs/api/liquid/objects/page) on a store. You can access a specific page through the pages object using the page's handle.
          
    {{ pages.contact.title }}
    {{ pages['about-us'].title }}

    {% paginate pages by 2 -%}
    {% for page in pages -%}
      {{ page.title | link_to: page.url }}
    {%- endfor %}

    {{- paginate | default_pagination }}
    {%- endpaginate %}
          
          `,
        },
        {
          title: "paginate",
          url: "https://shopify.dev/docs/api/liquid/objects/paginate",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "current_offset", type: "number" },
            { name: "current_page", type: "number" },
            { name: "items", type: "number" },
            { name: "next", type: "part" },
            { name: "page_param", type: "string" },
            { name: "page_size", type: "number" },
            { name: "pages", type: "number" },
            { name: "parts", type: "array of part" },
            { name: "previous", type: "part" },
          ],
          description: `Information about the pagination inside a set of [paginate tags](https://shopify.dev/docs/api/liquid/tags/paginate).`,
        },
        {
          title: "part",
          url: "https://shopify.dev/docs/api/liquid/objects/part",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "is_link", type: "boolean" },
            { name: "title", type: "string" },
            { name: "url", type: "string" },
          ],
          description: `A part in the navigation for pagination.
          
      {% paginate collection.products by 5 -%}
      {% for part in paginate.parts -%}
        {% if part.is_link -%}
          {{ part.title | link_to: part.url}}
        {%- else -%}
          <span>{{ part.title }}</span>
        {% endif %}
      {%- endfor %}
    {%- endpaginate %}
          
          `,
        },
        {
          title: "pending_payment_instruction_input",
          url: "https://shopify.dev/docs/api/liquid/objects/pending_payment_instruction_input",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "header", type: "link" },
            { name: "value", type: "string" },
          ],
          description: `Header-value pairs that make up the list of payment information specific to the payment method. This information can be be used by the customer to complete the transaction offline.`,
        },
        {
          title: "policy",
          url: "https://shopify.dev/docs/api/liquid/objects/policy",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "body", type: "string" },
            { name: "id", type: "number" },
            { name: "title", type: "string" },
            { name: "url", type: "string" },
          ],
          description: `A [store policy](https://help.shopify.com/manual/checkout-settings/refund-privacy-tos?shpxid=5995f953-CDD1-47F5-E2B5-BFF82C1881B3), such as a privacy or return policy.`,
        },
        {
          title: "powered_by_link",
          url: "https://shopify.dev/docs/api/liquid/objects/powered_by_link",
          keyword: ["objects"],
          category: "Objects",
          description: `Creates an HTML link element that links to a localied version of \`shopify.com\`, based on the locale of the store.
          
    {{ powered_by_link }}
          `,
        },
        {
          title: "predictive_search",
          url: "https://shopify.dev/docs/api/liquid/objects/predictive_search",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "performed", type: "boolean" },
            { name: "resources", type: "predictive_search_resources" },
            { name: "terms", type: "string" },
            { name: "types", type: "array of string" },
          ],
          description: `Information about the results from a predictive search query through the [Predictive Search API](https://shopify.dev/api/ajax/reference/predictive-search#get-locale-search-suggest). \n\n ## Note \n\n The predictive_search object returns results only when rendered in a section using the Predictive Search API and the [Section Rendering API](https://shopify.dev/api/section-rendering). To learn about how to include predictive search in your theme, refer to [Add predictive search to your theme](https://shopify.dev/themes/navigation-search/search/predictive-search).`,
        },
        {
          title: "predictive_search_resources",
          url: "https://shopify.dev/docs/api/liquid/objects/predictive_search_resources",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "articles", type: "array of article" },
            { name: "collections", type: "array of collection" },
            { name: "pages", type: "array of page" },
            { name: "products", type: "array of product" },
          ],
          description: `Contains arrays of objects for each resource type that can be returned by a [predictive search query](https://shopify.dev/api/ajax/reference/predictive-search#get-locale-search-suggest). You can check whether any resources of a specific type were returned using the [size filter](https://shopify.dev/docs/api/liquid/filters/size).
          
          
    {% if predictive_search.resources.articles.size > 0 %}
      {% for article in predictive_search.resources.articles %}
        {{ article.title }}
      {% endfor %}
    {% endif %}
          
          `,
        },
        {
          title: "product",
          url: "https://shopify.dev/docs/api/liquid/objects/product",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "available", type: "boolean" },
            { name: "collections", type: "array of collection" },
            { name: "compare_at_price", type: "number" },
            { name: "compare_at_price_max", type: "number" },
            { name: "compare_at_price_min", type: "number" },
            { name: "compare_at_price_varies", type: "boolean" },
            { name: "content", type: "string" },
            { name: "created_at", type: "string" },
            { name: "description", type: "string" },
            { name: "featured_image", type: "image" },
            { name: "featured_media", type: "media" },
            { name: "first_available_variant", type: "variant" },
            { name: "gift_card?", type: "boolean" },
            { name: "handle", type: "string" },
            { name: "has_only_default_variant", type: "boolean" },
            { name: "id", type: "number" },
            { name: "images", type: "array of image" },
            { name: "media", type: "array of media" },
            { name: "metafields", type: "-" },
            { name: "options", type: "array of string" },
            { name: "options_by_name", type: "-" },
            { name: "options_with_value", type: "array of product_option" },
            { name: "price", type: "number" },
            { name: "price_max", type: "number" },
            { name: "price_min", type: "number" },
            { name: "price_varies", type: "boolean" },
            { name: "published_at", type: "string" },
            { name: "quantity_price_breaks_configured?", type: "boolean" },
            { name: "requires_selling_plan", type: "boolean" },
            { name: "selected_of_first_available_selling_plan_allocation", type: "selling_plan_allocation" },
            { name: "selected_or_first_available_variant", type: "variant" },
            { name: "selected_selling_plan", type: "selling_plan" },
            { name: "selected_selling_plan_allocation", type: "selling_plan_allocation" },
            { name: "selected_variant", type: "variant" },
            { name: "selling_plan_groups", type: "array of selling_plan_group" },
            { name: "tags", type: "array of string" },
            { name: "template_suffix", type: "string" },
            { name: "title", type: "string" },
            { name: "type", type: "string" },
            { name: "url", type: "string" },
            { name: "variants", type: "array of variant" },
            { name: "vendor", type: "string" },
          ],
          description: `A [product](https://help.shopify.com/manual/products?shpxid=592bf10c-59C4-4CD2-4781-520D88A4013B) in the store.
          
    {
      "available": true,
      "collections": [],
      "compare_at_price": "25.00",
      "compare_at_price_max": "25.00",
      "compare_at_price_min": "25.00",
      "compare_at_price_varies": false,
      "content": "<h3>Are you low on health? Well we've got the potion just for you!</h3> <p>Just need a top up? Almost dead? In between? No need to worry
      because we have a range of sizes and strengths!</p>",
      "created_at": "2022-04-13 14:46:16 -0400",
      "description": "<h3>Are you low on health? Well we've got the potion just for you!</h3> <p>Just need a top up? Almost dead? In between? No need to worry
      because we have a range of sizes and strengths!</p>",
      "featured_image": {},
      "featured_media": {},
      "first_available_variant": {},
      "gift_card?": false,
      "handle": "health-potion",
      "has_only_default_variant": false,
      "id": 6786188247105,
      "images": [],
      "media": [],
      "metafields": {},
      "options": [
        "Size",
        "Strength"
      ],
      "options_by_name": {},
      "options_with_values": [],
      "price": "10.00",
      "price_max": "22.00",
      "price_min": "10.00",
      "price_varies": true,
      "published_at": "2022-04-13 14:53:34 -0400",
      "quantity_price_breaks_configured?": false,
      "requires_selling_plan": false,
      "selected_or_first_available_selling_plan_allocation": {},
      "selected_or_first_available_variant": {},
      "selected_selling_plan": null,
      "selected_selling_plan_allocation": null,
      "selected_variant": null,
      "selling_plan_groups": [],
      "tags": [
        "healing"
      ],
      "template_suffix": "",
      "title": "Health potion",
      "type": "Health",
      "url": {},
      "variants": [],
      "vendor": "Polina's Potent Potions"
    }
          
          `,
        },
        {
          title: "product_option",
          url: "https://shopify.dev/docs/api/liquid/objects/product_option",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "name", type: "string" },
            { name: "position", type: "number" },
            { name: "selected_values", type: "string" },
            { name: "values", type: "array of string" },
          ],
          description: `A product option, such as size or color.
          
    {
      "name": "Size",
      "position": 1,
      "selected_value": "S",
      "values": [
        "S",
        "M",
        "L"
      ]
    }
          
          `,
        },
        {
          title: "product_option_value",
          url: "https://shopify.dev/docs/api/liquid/objects/product_option_value",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "available", type: "boolean" },
            { name: "id", type: "number" },
            { name: "name", type: "string" },
            { name: "product_url", type: "string" },
            { name: "selected", type: "boolean" },
            { name: "swatch", type: "swatch" },
            { name: "variant", type: "variant" },
          ],
          description: `A product option value, such as "red" for the option "color"..
          
    {
      "available": true,
      "id": 2070385033281,
      "name": "Bronze",
      "product_url": null,
      "selected": true,
      "swatch": {},
      "variant": {}
    }
          
          `,
        },
        {
          title: "quantity_price_break",
          url: "https://shopify.dev/docs/api/liquid/objects/quantity_price_break",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "minimum_quantity", type: "number" },
            { name: "price", type: "number" },
          ],
          description: `The per-unit price of a variant when purchasing the minimum quantity or more.
          
    {
      "minimum_quantity": "10",
      "price": "20.00"
    }

          `,
        },
        {
          title: "quantity_rule",
          url: "https://shopify.dev/docs/api/liquid/objects/quantity_rule",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "increment", type: "number" },
            { name: "max", type: "number" },
            { name: "min", type: "number" },
          ],
          description: `A variant order quantity rule. \n\n If no rule exists, then a default value is returned. \n\n This rule can be set as part of a [B2B catalog](https://help.shopify.com/manual/b2b/catalogs/quantity-pricing?shpxid=592bf10c-59C4-4CD2-4781-520D88A4013B).
          
          
    {{ product.variants.first.quantity_rule }}
          `,
        },
        {
          title: "rating",
          url: "https://shopify.dev/docs/api/liquid/objects/rating",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "rating", type: "number" },
            { name: "scale_max", type: "number" },
            { name: "scale_min", type: "number" },
          ],
          description: `Information for a [rating type](https://shopify.dev/apps/metafields/types) metafield.
          
    {
      "rating": "4.5",
      "scale_max": "5.0",
      "scale_min": "0.0"
    }
          
          `,
        },
        {
          title: "recipient",
          url: "https://shopify.dev/docs/api/liquid/objects/recipient",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "email", type: "string" },
            { name: "name", type: "string" },
            { name: "nuckname", type: "string" },
          ],
          description: `A recipient that is associated with a [gift card](https://help.shopify.com/manual/products/gift-card-products?shpxid=592bf10c-59C4-4CD2-4781-520D88A4013B).
          
    {
      "email": "cornelius.potionmaker@gmail.com",
      "name": "Cornelius Potionmaker",
      "nickname": "Cornelius"
    }
          
          `,
        },
        {
          title: "recommendations",
          url: "https://shopify.dev/docs/api/liquid/objects/recommendations",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "intent", type: "string" },
            { name: "performed?", type: "boolean" },
            { name: "products", type: "array of product" },
            { name: "products_count", type: "number" },
          ],
          description: `Product recommendations for a specific product based on sales data, product descriptions, and collection relationships. \n\n Product recommendations become more accurate over time as new orders and product data become available. To learn more about how product recommendations are generated, refer to [Product recommendations](https://shopify.dev/themes/product-merchandising/recommendations).
          
          
    {
      "products": [],
      "products_count": 4,
      "performed?": true
    }
          
          `,
        },
        {
          title: "request",
          url: "https://shopify.dev/docs/api/liquid/objects/request",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "design_mode", type: "boolean" },
            { name: "host", type: "string" },
            { name: "locale", type: "shop_locale" },
            { name: "origin", type: "string" },
            { name: "page_type", type: "string from a set of values" },
            { name: "path", type: "string" },
            { name: "visual_preview_mode", type: "boolean" },
          ],
          description: `Information about the current URL and the associated page.
          
    {
      "design_mode": false,
      "host": "polinas-potent-potions.myshopify.com",
      "locale": {},
      "origin": "https://polinas-potent-potions.myshopify.com",
      "page_type": "index",
      "path": "/",
      "visual_preview_mode": false
    }
          
          `,
        },
        {
          title: "robots",
          url: "https://shopify.dev/docs/api/liquid/objects/robots",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [{ name: "default_groups", type: "array of group" }],
          description: `The default rule groups for the \`robots.txt\` file.
          
    {
      "default_groups": []
    }
          
          `,
        },
        {
          title: "routes",
          url: "https://shopify.dev/docs/api/liquid/objects/routes",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "account_addresses_url", type: "string" },
            { name: "account_login_url", type: "string" },
            { name: "account_logout_url", type: "string" },
            { name: "account_recover_url", type: "string" },
            { name: "account_register_url", type: "string" },
            { name: "account_url", type: "string" },
            { name: "all_products_collection_url", type: "string" },
            { name: "cart_add_url", type: "string" },
            { name: "cart_change_url", type: "string" },
            { name: "cart_clear_url", type: "string" },
            { name: "cart_update_url", type: "string" },
            { name: "cart_url", type: "string" },
            { name: "collections_url", type: "string" },
            { name: "predictive_search_url", type: "string" },
            { name: "product_recommendations_url", type: "string" },
            { name: "root_url", type: "string" },
            { name: "search_url", type: "string" },
          ],
          description: `Allows you to generate standard URLs for the storefront. \n\n Using the \`routes\` object instead of hardcoding URLs helps ensure that your theme supports [multiple languages](https://shopify.dev/themes/internationalization/multiple-currencies-languages), as well as any possible changes in URL format.
          
    {
      "account_addresses_url": "/account/addresses",
      "account_login_url": "/account/login",
      "account_logout_url": "/account/logout",
      "account_recover_url": "/account/recover",
      "account_register_url": "/account/register",
      "account_url": "/account",
      "all_products_collection_url": "/collections/all",
      "cart_add_url": "/cart/add",
      "cart_change_url": "/cart/change",
      "cart_clear_url": "/cart/clear",
      "cart_update_url": "/cart/update",
      "cart_url": "/cart",
      "collections_url": "/collections",
      "predictive_search_url": "/search/suggest",
      "product_recommendations_url": "/recommendations/products",
      "root_url": "/",
      "search_url": "/search"
    }     
          
          `,
        },
        {
          title: "rule",
          url: "https://shopify.dev/docs/api/liquid/objects/rule",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "directive", type: "string" },
            { name: "value", type: "string" },
          ],
          description: `A rule for the \`robots.txt\` file, which tells crawlers which pages can, or can't, be accessed. \n\n A rule consists of a directive, which can be either \`Allow\` or \`Disallow\`, and a value of the associated URL path.
          
          
    {
      "directive": "Disallow",
      "value": "/policies/"
    }
          
          `,
        },
        {
          title: "script",
          url: "https://shopify.dev/docs/api/liquid/objects/script",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "id", type: "number" },
            { name: "name", type: "string" },
          ],
          description: `Information about a Shopify Script.
          
    {
      "id": 209584193,
      "name": "10% off Whole bloodroot"
    }
          
          `,
        },
        {
          title: "scripts",
          url: "https://shopify.dev/docs/api/liquid/objects/scripts",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [{ name: "cart_calculate_line_items", type: "script" }],
          description: `The active scripts, of each script type, on the store. \n\n There can be only one active script of each type. Currently, the only type accessible in Liquid is \`cart_calculate_line_items\`.
          
    {
      "cart_calculate_line_items": {}
    }
          
          `,
        },
        {
          title: "search",
          url: "https://shopify.dev/docs/api/liquid/objects/search",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "default_sort_by", type: "string" },
            { name: "filters", type: " array of filter" },
            { name: "performed", type: "boolean" },
            { name: "results", type: "-" },
            { name: "results_count", type: "number" },
            { name: "sort_by", type: "-" },
            { name: "sort_options", type: "array of sort_option" },
            { name: "terms", type: "string" },
            { name: "types", type: "array of string" },
          ],
          description: `Information about a storefront search query. \n\n To learn about storefront search and how to include it in your theme, refer to [Storefront search](https://shopify.dev/themes/navigation-search/search).
          
    {
      "default_sort_by": "relevance",
      "filters": {},
      "performed": true,
      "results": [],
      "results_count": 14,
      "sort_by": "relevance",
      "sort_options": [],
      "terms": "potion",
      "types": [
        "article",
        "page",
        "product"
      ]
    }
          
          
          `,
        },
        {
          title: "section",
          url: "https://shopify.dev/docs/api/liquid/objects/section",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "blocks", type: "array of block" },
            { name: "id", type: "string" },
            { name: "index", type: "number" },
            { name: "index0", type: "number" },
            { name: "location", type: "string" },
            { name: "settings", type: "-" },
          ],
          description: `The properties and settings of a section.
          
    {
      "blocks": [],
      "id": "template--14453298921537__cart-items",
      "settings": {}
    }  
          
          `,
        },
        {
          title: "selling_plan",
          url: "https://shopify.dev/docs/api/liquid/objects/selling_plan",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "checkout_charge", type: "selling_plan_checkout_charge" },
            { name: "description", type: "string" },
            { name: "group_id", type: "string" },
            { name: "id", type: "number" },
            { name: "name", type: "string" },
            { name: "options", type: "array of selling_plan_option" },
            { name: "price_adjustments", type: "array of selling_plan_price_adjustment" },
            { name: "recurring_deliveries", type: "boolean" },
            { name: "selected", type: "boolean" },
          ],
          description: `Information about the intent of how a specific [selling plan](https://shopify.dev/apps/subscriptions/selling-plans) affects a line item. To learn about how to support selling plans in your theme, refer to [Purchase options](https://shopify.dev/themes/pricing-payments/purchase-options).
          
    {
      "checkout_charge": {},
      "description": null,
      "group_id": "f6f782040b07aa2353008932051a8d9bef0536d0",
      "id": 610435137,
      "name": "Delivery every 1 Week",
      "options": [],
      "price_adjustments": [],
      "recurring_deliveries": true,
      "selected": true
    }
          
          
          `,
        },
        {
          title: "selling_plan_allocation",
          url: "https://shopify.dev/docs/api/liquid/objects/selling_plan_allocation",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "checkout_charge_amount", type: "number" },
            { name: "compare_at_price", type: "number" },
            { name: "per_delivery_price", type: "number" },
            { name: "price", type: "number" },
            { name: "price_adjustment", type: "array of selling_plan_allocation_price_adjustment" },
            { name: "remaining_balance_charge_amount", type: "number" },
            { name: "selling_plan", type: "selling_plan" },
            { name: "selling_plan_group_id", type: "string" },
            { name: "unit_price", type: "number" },
          ],
          description: `Information about how a specific [selling plan](https://shopify.dev/apps/subscriptions/selling-plans) affects a line item. To learn about how to support selling plans in your theme, refer to [Purchase options](https://shopify.dev/themes/pricing-payments/purchase-options).
          
    {
      "checkout_charge_amount": "13.50",
      "compare_at_price": "15.00",
      "per_delivery_price": "13.50",
      "price": "13.50",
      "price_adjustments": [],
      "remaining_balance_charge_amount": "0.00",
      "selling_plan": {},
      "selling_plan_group_id": "f6f782040b07aa2353008932051a8d9bef0536d0",
      "unit_price": null
    }
          
          `,
        },
        {
          title: "selling_plan_allocation_price_adjustment",
          url: "https://shopify.dev/docs/api/liquid/objects/selling_plan_allocation_price_adjustment",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "position", type: "number" },
            { name: "price", type: "number" },
          ],
          description: `The resulting price from the intent of the associated [selling_plan_price_adjustment](https://shopify.dev/docs/api/liquid/objects/selling_plan_price_adjustment). To learn about how to support selling plans in your theme, refer to [Purchase options](https://shopify.dev/themes/pricing-payments/purchase-options).
          
    {
      "position": 1,
      "price": "13.50"
    }
          
          `,
        },
        {
          title: "selling_plan_checkout_charge",
          url: "https://shopify.dev/docs/api/liquid/objects/selling_plan_checkout_charge",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "value", type: "number" },
            { name: "value_type", type: "string from a set of values" },
          ],
          description: `Information about how a specific [selling plan](https://shopify.dev/apps/subscriptions/selling-plans) affects the amount that a customer needs to pay for a line item at checkout. To learn about how to support selling plans in your theme, refer to [Purchase options](https://shopify.dev/themes/pricing-payments/purchase-options).
          
    {
      "value": 100,
      "value_type": "percentage"
    }
          
          `,
        },
        {
          title: "selling_plan_group",
          url: "https://shopify.dev/docs/api/liquid/objects/selling_plan_group",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "app_id", type: "string" },
            { name: "id", type: "number" },
            { name: "name", type: "string" },
            { name: "options", type: "array of selling_plan_group_option" },
            { name: "selling_plan_selected", type: "boolean" },
            { name: "selling_plans", type: "array of selling_plan" },
          ],
          description: `Information about a specific group of [selling plans](https://shopify.dev/apps/subscriptions/selling-plans) that include any of a product's variants. Selling plans are grouped based on shared [selling plan option names](https://shopify.dev/docs/api/liquid/objects/selling_plan_option#selling_plan_option-name). To learn about how to support selling plans in your theme, refer to [Purchase options](https://shopify.dev/themes/pricing-payments/purchase-options).
          
          
    {
      "app_id": "294517",
      "id": "f6f782040b07aa2353008932051a8d9bef0536d0",
      "name": "Health potion",
      "options": [],
      "selling_plan_selected": false,
      "selling_plans": []
    }
          
          `,
        },
        {
          title: "selling_plan_group_option",
          url: "https://shopify.dev/docs/api/liquid/objects/selling_plan_group_option",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "name", type: "string" },
            { name: "position", type: "number" },
            { name: "selected_value", type: "string" },
            { name: "values", type: "array of string" },
          ],
          description: `Information about a specific option in a [selling plan group](https://shopify.dev/docs/api/liquid/objects/selling_plan_group).
          
    {
      "name": "1 Week(s), 4 Week(s)",
      "position": 1,
      "selected_value": null,
      "values": [
        "1 Week(s)",
        "4 Week(s)"
      ]
    }
          
          `,
        },
        {
          title: "selling_plan_option",
          url: "https://shopify.dev/docs/api/liquid/objects/selling_plan_option",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "name", type: "string" },
            { name: "position", type: "number" },
            { name: "values", type: "array of string" },
          ],
          description: `Information about a selling plan's value for a specific [selling_plan_group_option](https://shopify.dev/docs/api/liquid/objects/selling_plan_group_option). To learn about how to support selling plans in your theme, refer to [Purchase options](https://shopify.dev/themes/pricing-payments/purchase-options). 
          
    {
      "name": "1 Week(s), 4 Week(s)",
      "position": 1,
      "value": "1 Week(s)"
    }
          `,
        },
        {
          title: "selling_plan_price_adjustment",
          url: "https://shopify.dev/docs/api/liquid/objects/selling_plan_price_adjustment",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "order_count", type: "number" },
            { name: "position", type: "number" },
            { name: "value", type: "number" },
            { name: "value_type", type: "string from a set of values" },
          ],
          description: `Information about how a selling plan changes the price of a variant for a given period of time. To learn about how to support selling plans in your theme, refer to [Purchase options](https://shopify.dev/themes/pricing-payments/purchase-options).
          
          
    {
      "order_count": null,
      "position": 1,
      "value": 10,
      "value_type": "percentage"
    }
          
          `,
        },
        {
          title: "settings",
          url: "https://shopify.dev/docs/api/liquid/objects/settings",
          keyword: ["objects"],
          category: "Objects",
          description: `Allows you to access all of the theme's settings from the [settings_schema.json](https://shopify.dev/themes/architecture/config/settings-schema-json) file.
          
    {% if settings.favicon != blank %}
      <link rel="icon" type="image/png" href="{{ settings.favicon | image_url: width: 32, height: 32 }}">
    {% endif %}
          
          `,
        },
        {
          title: "shipping_method",
          url: "https://shopify.dev/docs/api/liquid/objects/shipping_method",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "discount_allocations", type: "array of discount_allocation" },
            { name: "handle", type: "string" },
            { name: "id", type: "string" },
            { name: "original_price", type: "number" },
            { name: "price", type: "number" },
            { name: "tax_lines", type: "array of tax_line" },
            { name: "title", type: "string" },
          ],
          description: `Information about the shipping method for an order.
          
    {
      "handle": "shopify-Standard-0.00",
      "id": "shopify-Standard-0.00",
      "original_price": "0.00",
      "price": "0.00",
      "tax_lines": [],
      "title": "Standard"
    }
          
          `,
        },
        {
          title: "shop",
          url: "https://shopify.dev/docs/api/liquid/objects/shop",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "accepts_gift_cards", type: "boolean" },
            { name: "address", type: "address" },
            { name: "brand", type: "brand" },
            { name: "collections_count", type: "number" },
            { name: "currency", type: "string" },
            { name: "customer_accounts_enabled", type: "boolean" },
            { name: "customer_accounts_optional", type: "boolean" },
            { name: "description", type: "string" },
            { name: "domain", type: "string" },
            { name: "email", type: "string" },
            { name: "enabled_currencies", type: "array of currency" },
            { name: "enabled_payment_types", type: "array of string" },
            { name: "id", type: "string" },
            { name: "metafields", type: "-" },
            { name: "metaobjects", type: "-" },
            { name: "money_format", type: "curreny" },
            { name: "money_with_currency_format", type: "string" },
            { name: "name", type: "string" },
            { name: "password_message", type: "string" },
            { name: "permanent_domain", type: "string" },
            { name: "phone", type: "string" },
            { name: "policies", type: "array of policy" },
            { name: "privacy_policy", type: "policy" },
            { name: "products_count", type: "number" },
            { name: "published_locales", type: "array of shop_locale" },
            { name: "refund_policy", type: "policy" },
            { name: "secure_url", type: "string" },
            { name: "shipping_policy", type: "policy" },
            { name: "subscription_policy", type: "policy" },
            { name: "terms_of_service", type: "policy" },
            { name: "types", type: "array of string" },
            { name: "url", type: "string" },
            { name: "vendors", type: "array of string" },
          ],
          objectPropertiesDeprecated: [
            { name: "enabled_locales", type: "array of shop_locale" },
            { name: "locale", type: "shop_locale" },
            { name: "taxes_included", type: "boolean" },
          ],
          description: `Information about the store, such as the store address, the total number of products, and various settings.
          
    {
      "accepts_gift_cards": true,
      "address": {},
      "brand": {},
      "collections_count": 7,
      "currency": "CAD",
      "customer_accounts_enabled": true,
      "customer_accounts_optional": true,
      "description": "Canada's foremost retailer for potions and potion accessories. Try one of our award-winning artisanal potions, or find the supplies to make your own!",
      "domain": "polinas-potent-potions.myshopify.com",
      "email": "polinas.potent.potions@gmail.com",
      "enabled_currencies": [],
      "enabled_locales": [],
      "enabled_payment_types": [
        "american_express",
        "apple_pay",
        "diners_club",
        "discover",
        "google_pay",
        "master",
        "paypal",
        "shopify_pay",
        "visa"
      ],
      "id": 56174706753,
      "locale": "en",
      "metafields": {},
      "metaobjects": {},
      "money_format": "\${{amount}}",
      "money_with_currency_format": "\${{amount}} CAD",
      "name": "Polina's Potent Potions",
      "password_message": "Our store will be opening when the moon is in the seventh house!!",
      "permanent_domain": "polinas-potent-potions.myshopify.com",
      "phone": "416-123-1234",
      "policies": [],
      "privacy_policy": {},
      "products_count": 18,
      "published_locales": [],
      "refund_policy": {},
      "secure_url": "https://polinas-potent-potions.myshopify.com",
      "shipping_policy": {},
      "subscription_policy": null,
      "taxes_included": false,
      "terms_of_service": {},
      "types": [
        "",
        "Animals & Pet Supplies",
        "Baking Flavors & Extracts",
        "Container",
        "Cooking & Baking Ingredients",
        "Dried Flowers",
        "Fruits & Vegetables",
        "Gift Cards",
        "Health",
        "Health & Beauty",
        "Invisibility",
        "Love",
        "Music & Sound Recordings",
        "Seasonings & Spices",
        "Water"
      ],
      "url": "https://polinas-potent-potions.myshopify.com",
      "vendors": [
        "Clover's Apothecary",
        "Polina's Potent Potions",
        "Ted's Apothecary Supply"
      ]
    }
          
          `,
        },
        {
          title: "shop_locale",
          url: "https://shopify.dev/docs/api/liquid/objects/shop_locale",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "endonym_name", type: "string" },
            { name: "iso_code", type: "string" },
            { name: "name", type: "string" },
            { name: "primary", type: "boolean" },
            { name: "root_url", type: "string" },
          ],
          description: `A language in a store. To learn how to offer localization options in your theme, refer to [Support multiple currencies and languages](https://shopify.dev/themes/internationalization/multiple-currencies-languages).
          
    {
      "endonym_name": "English",
      "iso_code": "en",
      "name": "English",
      "primary": true,
      "root_url": "/"
    }
          
          `,
        },
        {
          title: "sitemap",
          url: "https://shopify.dev/docs/api/liquid/objects/sitemap",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "directive", type: "string" },
            { name: "value", type: "string" },
          ],
          description: `The sitemap for a specific group in the [robots.txt](https://shopify.dev/themes/architecture/templates/robots-txt-liquid) file. \n\n The sitemap provides information about the pages and content on a site, and the relationships between them, which helps crawlers crawl a site more efficiently.
          
    {
      "directive": "Sitemap",
      "value": "https://polinas-potent-potions.myshopify.com/sitemap.xml"
    }
          `,
        },
        {
          title: "sort_option",
          url: "https://shopify.dev/docs/api/liquid/objects/sort_option",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "name", type: "string" },
            { name: "value", type: "string" },
          ],
          description: `A sort option for a collection or search results page.
          
    {
      "name": "Alphabetically, A-Z",
      "value": "title-ascending"
    }
          
          `,
        },
        {
          title: "store_availability",
          url: "https://shopify.dev/docs/api/liquid/objects/store_availability",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "available", type: "boolean" },
            { name: "location", type: "location" },
            { name: "pick_up_enabled", type: "boolean" },
            { name: "pick_up_time", type: "string" },
          ],
          description: `A variant's inventory information for a physical store location. \n\n If a location doesn't stock a variant, then there won't be a \`store_availability\` for that variant and location. 
          
          
    {
      "available": true,
      "location": {},
      "pick_up_enabled": true,
      "pick_up_time": "Usually ready in 24 hours"
    }
          
          `,
        },
        {
          title: "swatch",
          url: "https://shopify.dev/docs/api/liquid/objects/swatch",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "color", type: "color" },
            { name: "image", type: "image" },
          ],
          description: `Color and image for visual representation. Available for [product option values](https://shopify.dev/docs/api/liquid/objects/product_option_value) and [filter](https://shopify.dev/docs/api/liquid/objects/filter_value) values.
          
          
    {
      "color": {},
      "image": {}
    }
          
          `,
        },
        {
          title: "tablerowloop",
          url: "https://shopify.dev/docs/api/liquid/objects/tablerowloop",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "col", type: "number" },
            { name: "col0", type: "number" },
            { name: "col_first", type: "boolean" },
            { name: "col_last", type: "boolean" },
            { name: "first", type: "boolean" },
            { name: "index", type: "number" },
            { name: "index0", type: "number" },
            { name: "last", type: "boolean" },
            { name: "length", type: "number" },
            { name: "rindex", type: "number" },
            { name: "rindex0", type: "number" },
            { name: "row", type: "number" },
          ],
          description: `Information about a parent [tablerow loop](https://shopify.dev/docs/api/liquid/tags/tablerow).
          
          
    {
      "col": 1,
      "col0": 0,
      "col_first": true,
      "col_last": false,
      "first": true,
      "index": 1,
      "index0": 0,
      "last": false,
      "length": 5,
      "rindex": 5,
      "rindex0": 4,
      "row": 1
    }
          
          `,
        },
        {
          title: "tax_line",
          url: "https://shopify.dev/docs/api/liquid/objects/tax_line",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "price", type: "number" },
            { name: "rate", type: "number" },
            { name: "rate_percentage", type: "number" },
            { name: "title", type: "string" },
          ],
          description: `Information about a tax line of a checkout or order.
          
    {
      "price": 1901,
      "rate": 0.05,
      "rate_percentage": 5,
      "title": "GST"
    }
          
          `,
        },
        {
          title: "taxonomy_category",
          url: "https://shopify.dev/docs/api/liquid/objects/taxonomy_category",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "ancestors", type: "array of taxonomy category" },
            { name: "gid", type: "string" },
            { name: "id", type: "string" },
            { name: "name", type: "string" },
          ],
          description: `The taxonomy category for a product
          
    {
      "ancestors": [],
      "gid": "gid://shopify/TaxonomyCategory/hb-1-9-6",
      "id": "hb-1-9-6",
      "name": "Vitamins & Supplements"
    }
          
          `,
        },
        {
          title: "template",
          url: "https://shopify.dev/docs/api/liquid/objects/template",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "directory", type: "string" },
            { name: "name", type: "string from a set of values" },
            { name: "suffix", type: "string" },
          ],
          description: `Information about the current [template](https://shopify.dev/docs/themes/architecture/templates).
          
    {
      "directory": null,
      "name": "product",
      "suffix": null
    }
          `,
        },
        {
          title: "theme",
          url: "https://shopify.dev/docs/api/liquid/objects/theme",
          keyword: ["objects"],
          category: "Objects",
          isDeprecated: true,
          objectProperties: [
            { name: "id", type: "number" },
            { name: "name", type: "string" },
            { name: "role", type: "string from a set of values" },
          ],
          description: `Information about the current theme. \n\n ## ⚠️ Deprecated \n\n Deprecated because the values of this object's properties are subject to change, so can't be relied on within the theme. If you want to link to the theme editor for the published theme, then you can use the URL path \`/admin/themes/current/editor\`\n\n While this object is deprecated in Liquid and shouldn't be used, you can still access it through the [REST Admin API](https://shopify.dev/api/admin-rest/current/resources/theme).
    {
      "id": 124051750977,
      "name": "Dawn",
      "role": "main"
    }
          
          `,
        },
        {
          title: "transaction",
          url: "https://shopify.dev/docs/api/liquid/objects/transaction",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "amount", type: "number" },
            { name: "buyer_pending_payment_instructions", type: "array of pending_payment_instruction_input" },
            { name: "buyer_pending_payment_notice", type: "string" },
            { name: "created_at", type: "string" },
            { name: "gateway", type: "string" },
            { name: "gateway_display_name", type: "string" },
            { name: "id", type: "number" },
            { name: "kind", type: "string from a set of values" },
            { name: "name", type: "string" },
            { name: "payment_details", type: "transaction_payment_details" },
            { name: "receipt", type: "string" },
            { name: "show_buyer_pending_payment_instructions?", type: "boolean" },
            { name: "status", type: "string from a set of values" },
            { name: "status_label", type: "string" },
          ],
          description: `A transaction associated with a checkout or order.
          
          
    {
      "amount": "380.25",
      "created_at": "2022-06-15 19:13:14 -0400",
      "gateway": "shopify_payments",
      "gateway_display_name": "Shopify payments",
      "id": 5432242176065,
      "kind": "sale",
      "name": "c29944051400769.",
      "payment_details": {
        "credit_card_number": "•••• •••• •••• 4242",
        "credit_card_company": "Visa",
        "credit_card_last_four_digits": "4242",
        "receiver_info": null
      },
      "receipt": "...",
      "show_buyer_pending_payment_instructions?": null,
      "status": "success",
      "status_label": "Success"
    }
          
          `,
        },
        {
          title: "transaction_payment_details",
          url: "https://shopify.dev/docs/api/liquid/objects/transaction_payment_details",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "credit_card_company", type: "string" },
            { name: "credit_card_last_four_digits", type: "string" },
            { name: "credit_card_number", type: "string" },
            { name: "gift_card", type: "gift_card" },
          ],
          description: `Information about the payment methods used for a transaction.
          
    {
      "credit_card_number": "•••• •••• •••• 4242",
      "credit_card_company": "Visa",
      "credit_card_last_four_digits": "4242"
    }     
          `,
        },
        {
          title: "unit_price_measurement",
          url: "https://shopify.dev/docs/api/liquid/objects/transaction_payment_details",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "measured_type", type: "string from a set of values" },
            { name: "quantity_unit", type: "string" },
            { name: "quantity_value", type: "number" },
            { name: "reference_unit", type: "string" },
            { name: "reference_value", type: "number" },
          ],
          description: `Information about how units of a product variant are measured. It's used to calculate [unit prices](https://help.shopify.com/manual/intro-to-shopify/initial-setup/sell-in-france/price-per-unit?shpxid=592bf10c-59C4-4CD2-4781-520D88A4013B#add-unit-prices-to-your-product).
          
          
      {
        "measured_type": "weight",
        "quantity_value": "500.0",
        "quantity_unit": "g",
        "reference_value": 1,
        "reference_unit": "kg"
      }    
          
          `,
        },
        {
          title: "user",
          url: "https://shopify.dev/docs/api/liquid/objects/user",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "account_owner", type: "boolean" },
            { name: "bio", type: "string" },
            { name: "email", type: "string" },
            { name: "first_name", type: "string" },
            { name: "homepage", type: "string" },
            { name: "image", type: "image" },
            { name: "last_name", type: "string" },
            { name: "name", type: "string" },
          ],
          description: `The author of a blog article.
          
    {
      "account_owner": false,
      "bio": "Polina got her first cauldron at the tender age of six, and she has been passionate about potions ever since!!",
      "email": "polinas.potent.potions@gmail.com",
      "first_name": "Polina",
      "homepage": null,
      "image": {},
      "last_name": "Waters",
      "name": "Polina Waters"
    }
          
          `,
        },
        {
          title: "user_agent",
          url: "https://shopify.dev/docs/api/liquid/objects/user_agent",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "directive", type: "string" },
            { name: "value", type: "string" },
          ],
          description: `The user-agent, which is the name of the crawler, for a specific group in the [robots.txt file](https://shopify.dev/themes/architecture/templates/robots-txt-liquid). The \`user_agent\` object consists of a \`User-agent\` directive, and a value of the name of the user-agent. For example: \n\n \`User-agent: *\`
        
    {
      "directive": "User-agent",
      "value": "*"
    }  
          
          `,
        },
        {
          title: "variant",
          url: "https://shopify.dev/docs/api/liquid/objects/variant",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "available", type: "boolean" },
            { name: "barcode", type: "string" },
            { name: "compare_at_price", type: "number" },
            { name: "featured_image", type: "image" },
            { name: "featured_media", type: "media" },
            { name: "id", type: "number" },
            { name: "image", type: "image" },
            { name: "incoming", type: "boolean" },
            { name: "inventory_management", type: "string" },
            { name: "inventory_policy", type: "string from a set of values" },
            { name: "inventory_quantity", type: "number" },
            { name: "matched", type: "boolean" },
            { name: "metafields", type: "-" },
            { name: "next_incoming_date", type: "string" },
            { name: "option1", type: "string" },
            { name: "option2", type: "string" },
            { name: "option3", type: "string" },
            { name: "options", type: "array of string" },
            { name: "price", type: "number" },
            { name: "product", type: "product" },
            { name: "quantity_price_breaks", type: "array of quantity_price_break" },
            { name: "quantity_price_breaks_configured?", type: "boolean" },
            { name: "quantity_rule", type: "quantity_rule" },
            { name: "requires_selling_plan", type: "boolean" },
            { name: "requires_shipping", type: "boolean" },
            { name: "selected", type: "boolean" },
            { name: "selected_selling_plan_allocation", type: "selling_plan_allocation" },
            { name: "selling_plan_allocations", type: "array of selling_plan_allocation" },
            { name: "sku", type: "string" },
            { name: "store_availabilities", type: "array of store_availability" },
            { name: "taxable", type: "boolean" },
            { name: "title", type: "string" },
            { name: "unit_price", type: "number" },
            { name: "unit_price_measurement", type: "unit_price_measurement" },
            { name: "url", type: "url" },
            { name: "weight", type: "number" },
            { name: "weight_in_unit", type: "number" },
            { name: "weight_unit", type: "string" },
          ],
          description: `A [product variant](https://help.shopify.com/manual/products/variants?shpxid=592bf10c-59C4-4CD2-4781-520D88A4013B).
          
    {
      "available": true,
      "barcode": "",
      "compare_at_price": null,
      "featured_image": null,
      "featured_media": null,
      "id": 39897499729985,
      "image": null,
      "incoming": false,
      "inventory_management": "shopify",
      "inventory_policy": "deny",
      "inventory_quantity": 5,
      "matched": true,
      "metafields": {},
      "next_incoming_date": null,
      "option1": "S",
      "option2": "Low",
      "option3": null,
      "options": [
        "S",
        "Low"
      ],
      "price": "10.00",
      "product": {},
      "quantity_price_breaks": [],
      "quantity_rule": {},
      "requires_selling_plan": false,
      "requires_shipping": true,
      "selected": false,
      "selected_selling_plan_allocation": null,
      "selling_plan_allocations": [],
      "sku": "",
      "store_availabilities": [],
      "taxable": true,
      "title": "S / Low",
      "unit_price": null,
      "unit_price_measurement": null,
      "url": {},
      "weight": 500,
      "weight_in_unit": 500,
      "weight_unit": "g"
    }    
          
          `,
        },
        {
          title: "video",
          url: "https://shopify.dev/docs/api/liquid/objects/video",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "alt", type: "string" },
            { name: "aspect_ratio", type: "number" },
            { name: "duration", type: "number" },
            { name: "id", type: "number" },
            { name: "media_type", type: "string from a set of values" },
            { name: "position", type: "number" },
            { name: "preview_image", type: "image" },
            { name: "sources", type: "array of video_source" },
          ],
          description: `Information about a video uploaded as [product media](https://shopify.dev/docs/api/liquid/objects/product-media) or a [file_reference metafield](https://shopify.dev/apps/metafields/types).
          
          
    {
      "alt": "Potion beats",
      "aspect_ratio": 1.779,
      "duration": 34801,
      "id": 22070396551233,
      "media_type": "video",
      "position": 2,
      "preview_image": {},
      "sources": []
    }
          
          `,
        },
        {
          title: "video_source",
          url: "https://shopify.dev/docs/api/liquid/objects/video",
          keyword: ["objects"],
          category: "Objects",
          objectProperties: [
            { name: "format", type: "string" },
            { name: "height", type: "number" },
            { name: "mime_type", type: "string" },
            { name: "url", type: "string" },
            { name: "width", type: "number" },
          ],
          description: `Information about the source files for a video.
          
    {
      "format": "mp4",
      "height": 1080,
      "mime_type": "video/mp4",
      "url": "https://cdn.shopify.com/videos/c/vp/4edc28a708b7405093a927cebe794f1a/4edc28a708b7405093a927cebe794f1a.HD-1080p-7.2Mbps.mp4",
      "width": 1920
    }
          
          `,
        },
      ],
    },
  },
];
