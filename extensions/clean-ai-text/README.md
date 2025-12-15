# Clean AI Text

Remove formatting artifacts from AI-generated text and get properly formatted rich text ready to paste into Slack, Notion, and other apps.

## Features

- **Fix curly quotes** - Converts "smart quotes" to straight quotes
- **Fix dashes** - Converts em-dashes and en-dashes to regular hyphens
- **Fix ellipsis** - Converts the ellipsis character to three periods
- **Clean lists** - Converts tab-indented numbered and bullet lists to clean markdown format
- **Remove hidden characters** - Strips zero-width spaces, BOM, and other invisible formatting characters
- **Rich text output** - Produces properly formatted RTF so lists paste correctly into Slack, Notion, etc.

## Usage

1. Copy text from ChatGPT, Claude, or other AI tools
2. Run the "Clean AI Text from Clipboard" command
3. Paste into Slack, Notion, or any other app - lists will be properly formatted!

## Why?

Text copied from AI chat interfaces often contains:
- Curly/smart quotes that can cause issues in code or plain text contexts
- Tab-based list formatting that doesn't paste correctly into other apps
- Hidden Unicode characters that cause subtle problems

This extension cleans all that up and produces properly formatted rich text.
