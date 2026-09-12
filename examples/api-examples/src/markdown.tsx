import { Detail } from "@raycast/api";

const markdown = `
# Markdown

Simply render markdown, including:
- Headings and blockquotes
- **Bold** and _italics_ emphasis
- Code blocks and \`inline code\`

For more, check out the [CommonMark](https://commonmark.org) spec.
`;

export default function Command() {
  return <Detail markdown={markdown} />;
}
