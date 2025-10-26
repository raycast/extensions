import { ActionPanel, Action, Icon, Detail } from "@raycast/api";

const searchTipsMarkdown = `
## Search by keywords

### Search full keywords

By default, each keyword separated by spaces is treated as a separate search term, and the search returns codepoints that match all the specified terms.

To search for an exact phrase, enclose the phrase in double quotes (\`"\`).

- \`"mathematical double"\` will return codepoints that match the exact phrase “mathematical double”, like “MATHEMATICAL DOUBLE-STRUCK CAPITAL A”
- \`mathematical double\` (without quotes) will return codepoints that match both “mathematical” and “double”, like “MATHEMATICAL LEFT DOUBLE ANGLE BRACKET”

### Search in OR mode

You can perform an OR search by beginning the search query with \`-or\`.

- \`-or arrow star\` will return codepoints that match either “arrow” or “star”.

## Search codepoints by values

### Search by exact codepoint values

You can search for Unicode codepoints by their values in various formats    

- **Hexadecimal**:  \`FFFD\`, \`U+FFFD\`, \`0xFFFD\`, \`%xFFFD\`
- **Decimal**:  \`0d65533\`
- **Binary**:  \`0b1111111111111101\`
- **Octal**:  \`0o177775\`

### Search ranges of codepoints

You can search for ranges of Unicode codepoints using two values separated by \`..\` or \`-\`

- \`U+0041..U+005A\`, \`0x61-0x7A\`, \`0d48..0d57\`

### Search by UTF-8 byte sequences

You can search for codepoints by their UTF-8 byte sequences using the \`utf8:\` prefix followed by hexadecimal byte values.

- \`utf8:EFBBBF\` (for U+FEFF)
- \`utf8:41\` (for U+0041)

### Combining multiple search patterns

You can combine multiple search patterns in a single query by separating them with spaces. For example:

- \`U+0041 0b1100001 utf8:EFBBBF\`
- \`0x1F600..0x1F64F U+00A9 0d170\`
`;

export function SearchUnicodeTips() {
  return (
    <ActionPanel.Section>
      <Action.Push
        title="Advanced Search Tips"
        icon={Icon.Sidebar}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "h" },
          windows: { modifiers: ["ctrl"], key: "h" },
        }}
        target={
          <Detail
            navigationTitle="Advanced Search Tips"
            markdown={searchTipsMarkdown}
          />
        }
      />
    </ActionPanel.Section>
  );
}
