const markdownReference = [
  {
    name: "Blockquotes",
    description: "To create a blockquote, add a `>` in front of a paragraph.",
    examples: [
      {
        markdown: "> Dorothy followed her through many of the beautiful rooms in her castle.",
        html: "<blockquote><p>Dorothy followed her through many of the beautiful rooms in her castle.</p></blockquote>",
      },
    ],
    additional_examples: [
      {
        name: "Blockquotes with Multiple Paragraphs",
        description:
          "Blockquotes can contain multiple paragraphs. Add a `>` on the blank lines between the paragraphs.",
        markdown:
          "> Dorothy followed her through many of the beautiful rooms in her castle.\n>\n> The Witch bade her clean the pots and kettles and sweep the floor and keep the fire fed with wood.\n",
        html: "<blockquote><p>Dorothy followed her through many of the beautiful rooms in her castle.</p><p>The Witch bade her clean the pots and kettles and sweep the floor and keep the fire fed with wood.</p></blockquote>",
      },

      {
        name: "Nested Blockquotes",
        description: "Blockquotes can be nested. Add a `>>` in front of the paragraph you want to nest.",
        markdown:
          "> Dorothy followed her through many of the beautiful rooms in her castle.\n>\n>> The Witch bade her clean the pots and kettles and sweep the floor and keep the fire fed with wood.\n",
        html: "<blockquote><p>Dorothy followed her through many of the beautiful rooms in her castle.</p><blockquote><p>The Witch bade her clean the pots and kettles and sweep the floor and keep the fire fed with wood.</p></blockquote></blockquote>",
      },

      {
        name: "Blockquotes with Other Elements",
        description:
          "Blockquotes can contain other Markdown formatted elements. Not all elements can be used — you'll need to experiment to see which ones work.",
        markdown:
          "> ### The quarterly results look great!\n>\n> - Revenue was off the chart.\n> - Profits were higher than ever.\n>\n>  *Everything* is going according to **plan**.\n",
        html: "<blockquote><h3>The quarterly results look great!</h3><ul><li>Revenue was off the chart.</li><li>Profits were higher than ever.</li></ul><p><em>Everything</em> is going according to <strong>plan</strong>.</p></blockquote>",
      },
    ],
  },
  {
    name: "Bold",
    description:
      "To bold text, add two asterisks or underscores before and after a word or phrase. To bold the middle of a word for emphasis, add two asterisks without spaces around the letters.",
    examples: [
      {
        markdown: "I just love **bold text**.",
        html: "I just love <strong>bold text</strong>.",
      },

      {
        markdown: "I just love __bold text__.",
        html: "I just love <strong>bold text</strong>.",
      },

      {
        markdown: "Love**is**bold",
        html: "Love<strong>is</strong>bold",
      },
    ],
    additional_examples: [],
  },
  {
    name: "Code",
    description: "To denote a word or phrase as code, enclose it in tick marks (`` ` ``).",
    examples: [
      {
        markdown: "At the command prompt, type `nano`.",
        html: "At the command prompt, type <code>nano</code>.",
      },
    ],
    additional_examples: [
      {
        name: "Escaping Tick Marks",
        description:
          "If the word or phrase you want to denote as code includes one or more tick marks, you can escape it by enclosing the word or phrase in double tick marks (<code>``</code>).",
        markdown: "``Use `code` in your Markdown file.``",
        html: "<code>Use `code` in your Markdown file.</code>",
      },

      {
        name: "Code Blocks",
        description: "To create code blocks, indent every line of the block by at least four spaces or one tab.",
        markdown: "<html>\n  <head>\n  </head>\n</html>\n",
        html: "<pre><code><html><head></head></html></code></pre>",
      },
    ],
  },
  {
    name: "Headings",
    description:
      "To create a heading, add number signs (`#`) in front of a word or phrase. The number of number signs you use should correspond to the heading level. For example, to create a heading level three (`<h3>`), use three number signs (e.g., `### My Header`).",
    examples: [
      {
        markdown: "# Heading level 1",
        html: "<h1>Heading level 1</h1>",
      },

      {
        markdown: "## Heading level 2",
        html: "<h2>Heading level 2</h2>",
      },

      {
        markdown: "### Heading level 3",
        html: "<h3>Heading level 3</h3>",
      },

      {
        markdown: "#### Heading level 4",
        html: "<h4>Heading level 4</h4>",
      },

      {
        markdown: "##### Heading level 5",
        html: "<h5>Heading level 5</h5>",
      },

      {
        markdown: "###### Heading level 6",
        html: "<h6>Heading level 6</h6>",
      },
    ],
    additional_examples: [
      {
        name: "Alternative H1 Syntax",
        description: "Alternatively, on the line below the text, add any number of == characters for heading level 1.",
        markdown: "Heading level 1\n===============\n",
        html: "<h1>Heading level 1</h1>",
      },

      {
        name: "Alternative H2 Syntax",
        description: "Alternatively, on the line below the text, add any number of -- characters for heading level 2.",
        markdown: "Heading level 2\n---------------\n",
        html: "<h2>Heading level 2</h2>",
      },
    ],
  },
  {
    name: "Horizontal Rules",
    description:
      "To create a horizontal rule, use three or more asterisks (`***`), dashes (`---`), or underscores (`___`) on a line by themselves.",
    examples: [
      {
        markdown: "***",
        html: "<hr>",
      },

      {
        markdown: "---",
        html: "<hr>",
      },

      {
        markdown: "_________________",
        html: "<hr>",
      },
    ],
    additional_examples: [],
  },
  {
    name: "Images",
    description:
      "To add an image, add an exclamation mark (`!`), followed by alt text in brackets, and the path or URL to the image asset in parentheses. You can optionally add a title after the URL in the parentheses.",
    examples: [
      {
        markdown:
          "![Philadelphia's Magic Gardens. This place was so cool!](/assets/images/philly-magic-gardens.jpg \"Philadelphia's Magic Gardens\")\n",
        html: '<img src="/assets/images/philly-magic-garden.jpg" class="img-responsive" alt="Philadelphia\'s Magic Gardens. This place was so cool!" title="Philadelphia\'s Magic Gardens">',
      },
    ],
    additional_examples: [
      {
        name: "Linking Images",
        description:
          "To add a link to an image, enclose the Markdown for the image in brackets, and then add the link in parentheses.",
        markdown:
          '[![An old rock in the desert](/assets/images/shiprock.jpg "Shiprock, New Mexico by Beau Rogers")](https://images.unsplash.com/photo-1556010334-d6ed191db491?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8cm9ja3xlbnwwfHwwfHw%3D&auto=format&fit=crop&w=900&q=60)\n',
        html: '<a href="https://images.unsplash.com/photo-1556010334-d6ed191db491?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8cm9ja3xlbnwwfHwwfHw%3D&auto=format&fit=crop&w=900&q=60" alt="An old rock in the desert" title="Shiprock, New Mexico by Beau Rogers"></a>',
      },
    ],
  },
  {
    name: "Italic",
    description:
      "To italicize text, add one asterisk or underscore before and after a word or phrase. To italicize the middle of a word for emphasis, add one asterisk without spaces around the letters.",
    examples: [
      {
        markdown: "Italicized text is the *cat's meow*.",
        html: "Italicized text is the <em>cat's meow</em>.",
      },

      {
        markdown: "Italicized text is the _cat's meow_.",
        html: "Italicized text is the <em>cat's meow</em>.",
      },

      {
        markdown: "A*cat*meow",
        html: "A<em>cat</em>meow",
      },
    ],
    additional_examples: [],
  },
  {
    name: "Line Breaks",
    description: "To create a line break (`<br>`), end a line with two or more spaces, and then type return.",
    examples: [
      {
        markdown: "This is the first line.  \nAnd this is the second line.\n",
        html: "<p>This is the first line.  <br>And this is the second line.</p>",
      },
    ],
    additional_examples: [],
  },
  {
    name: "Links",
    description:
      "To create a link, enclose the link text in brackets (e.g., `[Duck Duck Go]`) and then follow it immediately with the URL in parentheses (e.g., `(https://duckduckgo.com)`). You can optionally add a title after the URL in the parentheses.",
    examples: [
      {
        markdown:
          'My favorite search engine is [Duck Duck Go](https://duckduckgo.com "The best search engine for privacy").',
        html: 'My favorite search engine is <a href="https://duckduckgo.com" title="The best search engine for privacy">Duck Duck Go</a>.',
      },
    ],
    additional_examples: [
      {
        name: "URLs and Email Addresses",
        description: "To quickly turn a URL or email address into a link, enclose it in angle brackets.",
        markdown: "<https://www.markdownguide.org><fake@example.com>",
        html: '<a href="https://www.markdownguide.org">https://www.markdownguide.org</a><a href="&#x6d;&#97;&#105;&#x6c;&#116;&#x6f;&#58;&#x66;&#x61;&#x6b;&#101;&#64;&#x65;&#120;&#x61;&#x6d;&#x70;&#108;&#101;&#46;&#99;&#x6f;&#109;">&#x66;&#x61;&#x6b;&#101;&#64;&#x65;&#120;&#x61;&#x6d;&#x70;&#108;&#101;&#46;&#99;&#x6f;&#109;</a>',
      },

      {
        name: "Formatting Links",
        description: "To emphasize links, add asterisks before and after the brackets and parentheses.",
        markdown:
          "I love supporting **[EFF](https://eff.org)**. This is the *[Markdown Guide](https://www.markdownguide.org)*.",
        html: 'I love supporting <strong><a href="https://eff.org">EFF</a></strong>. This is the <em><a href="https://www.markdownguide.org">Markdown Guide</a></em>.',
      },
    ],
  },
  {
    name: "Ordered Lists",
    description:
      "To create an ordered list, add line items with numbers followed by periods. The numbers don't have to be in numerical order, but the list should start with the number one.",
    examples: [
      {
        markdown: "1. First item\n2. Second item\n3. Third item\n4. Fourth item\n",
        html: "<ol><li>First item</li><li>Second item</li><li>Third item</li><li>Fourth item</li></ol>",
      },

      {
        markdown: "1. First item\n1. Second item\n1. Third item\n1. Fourth item\n",
        html: "<ol><li>First item</li><li>Second item</li><li>Third item</li><li>Fourth item</li></ol>",
      },

      {
        markdown: "1. First item\n8. Second item\n3. Third item\n5. Fourth item\n",
        html: "<ol><li>First item</li><li>Second item</li><li>Third item</li><li>Fourth item</li></ol>",
      },

      {
        markdown:
          "1. First item\n2. Second item\n3. Third item\n  1. Indented item\n  2. Indented item\n4. Fourth item\n",
        html: "<ol><li>First item</li><li>Second item</li><li>Third item<ol><li>Indented item</li><li>Indented item</li></ol></li><li>Fourth item</li></ol>",
      },
    ],
    additional_examples: [],
  },
  {
    name: "Paragraphs",
    description:
      "To create paragraphs, use a blank line to separate one or more lines of text. You should not indent paragraphs with spaces or tabs.",
    examples: [
      {
        markdown: "I really like using Markdown.\n\nI think I'll use it to format all of my documents from now on.\n",
        html: "<p>I really like using Markdown.</p><p>I think I'll use it to format all of my documents from now on.</p>",
      },
    ],
    additional_examples: [],
  },
  {
    name: "Unordered Lists",
    description:
      "To create an unordered list, add dashes (`-`), asterisks (`*`), or plus signs (`+`) in front of line items. Indent one or more items to create a nested list.",
    examples: [
      {
        markdown: "- First item\n- Second item\n- Third item\n- Fourth item\n",
        html: "<ul><li>First item</li><li>Second item</li><li>Third item</li><li>Fourth item</li></ul>",
      },

      {
        markdown: "* First item\n* Second item\n* Third item\n* Fourth item\n",
        html: "<ul><li>First item</li><li>Second item</li><li>Third item</li><li>Fourth item</li></ul>",
      },

      {
        markdown: "+ First item\n* Second item\n- Third item\n+ Fourth item\n",
        html: "<ul><li>First item</li><li>Second item</li><li>Third item</li><li>Fourth item</li></ul>",
      },

      {
        markdown:
          "- First item\n- Second item\n- Third item\n    - Indented item\n    - Indented item\n- Fourth item\n",
        html: "<ul><li>First item</li><li>Second item</li><li>Third item<ul><li>Indented item</li><li>Indented item</li></ul></li><li>Fourth item</li></ul>",
      },
    ],
    additional_examples: [],
  },
];

export default markdownReference;
