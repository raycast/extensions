import { List, Icon, Color, Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";

import stringLength from "string-length";
import stringWidth from "string-width";

export default function Command() {
  const [input, setInput] = useState<string>("");

  useEffect(() => {
    if (!input) {
      Clipboard.read().then(({ text }) => setInput(text));
    }
  }, [input]);

  return (
    <List
      onSearchTextChange={(value) => setInput(value)}
      searchBarPlaceholder={"Input text..."}
    >
      <List.Section title={`Input: ${input}`}>
        <List.Item
          key={"length"}
          icon={{ source: Icon.Hashtag, tintColor: Color.Magenta }}
          title={"Length"}
          subtitle={String(String(input).length)}
        />
        {String(input).length !== stringLength(input) && (
          <List.Item
            key={"length-corrected"}
            icon={{ source: Icon.Hashtag, tintColor: Color.Magenta }}
            title={"Length (Corrected)"}
            subtitle={{
              value: stringLength(input).toString(),
              tooltip:
                "This string might contain astral symbols. This length reflects the string length with ansi escape codes ignored.",
            }}
          />
        )}
        {String(input).length !== stringWidth(input) && (
          <List.Item
            key={"width"}
            icon={{ source: Icon.Hashtag, tintColor: Color.Magenta }}
            title={"Width"}
            subtitle={{
              value: stringWidth(input).toString(),
              tooltip:
                "The width of this string differs from its length due to special characters.",
            }}
          />
        )}
      </List.Section>
    </List>
  );
}
