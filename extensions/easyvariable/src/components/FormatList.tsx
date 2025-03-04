import { useState } from "react";
import { ActionPanel, Action, Icon, List, Clipboard, Keyboard } from "@raycast/api";
import { formatCamelCase } from "../utils/formatters/camelCase";
import { formatPascalCase } from "../utils/formatters/pascalCase";
import { formatSnakeCase } from "../utils/formatters/snakeCase";
import { formatKebabCase } from "../utils/formatters/kebabCase";
import { formatConstant } from "../utils/formatters/constant";

interface FormatListProps {
  text: string;
}

export function FormatList({ text }: FormatListProps) {
  const formats = [
    { name: "camelCase", format: formatCamelCase, example: "userName", alias: "xt" },
    { name: "PascalCase", format: formatPascalCase, example: "UserName", alias: "dt" },
    { name: "snake_case", format: formatSnakeCase, example: "user_name", alias: "xh" },
    { name: "kebab-case", format: formatKebabCase, example: "user-name", alias: "hx" },
    { name: "CONSTANT_CASE", format: formatConstant, example: "USER_NAME", alias: "cl" },
  ];

  const [searchText, setSearchText] = useState("");

  const filteredFormats = formats.filter(
    (format) =>
      format.name.toLowerCase().includes(searchText.toLowerCase()) ||
      format.alias.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List searchText={searchText} onSearchTextChange={setSearchText} searchBarPlaceholder="Search format...">
      {filteredFormats.map((format, index) => (
        <List.Item
          key={format.name}
          title={format.format(text)}
          subtitle={`${format.name} (${format.alias})`}
          accessories={[{ text: `⌘${index + 1}` }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title="Paste"
                  icon={Icon.TextInput}
                  shortcut={{ key: String(index + 1) as Keyboard.KeyEquivalent, modifiers: ["cmd"] }}
                  onAction={async () => await Clipboard.paste(format.format(text))}
                />
                <Action
                  title="Copy to Clipboard"
                  icon={Icon.CopyClipboard}
                  onAction={async () => await Clipboard.copy(format.format(text))}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
