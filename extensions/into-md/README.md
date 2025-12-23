# Into MD

Convert any webpage to LLM-friendly markdown using [into.md](https://into.md).

## Requirements

This extension requires the [Raycast Browser Extension](https://raycast.com/browser-extension) to detect your current browser tab.

## Usage

1. Navigate to any webpage in your browser
2. Run the **Convert Current Page** command
3. Markdown is copied to your clipboard, wrapped in XML:

```xml
<site>
<url>https://example.com/page</url>
<content>
# Page Title

Page content in markdown...
</content>
</site>
```

## Why XML Wrapping?

The XML structure makes it easy to paste web content into LLM conversations with clear source attribution. The `<url>` tag preserves the original source, while `<content>` contains the clean markdown.

## Limitations

Some sites may not convert properly:
- JavaScript-heavy single-page applications
- Sites with bot protection
- Pages requiring authentication

If conversion fails, you'll see an error message.
