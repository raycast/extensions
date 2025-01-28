import { List, Icon, Color, Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";

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
      </List.Section>
      <List.EmptyView
        icon={{ source: Icon.QuestionMarkCircle, tintColor: Color.Red }}
        title={"Nothing to Encode / Decode"}
        description={
          "Copy some content to your clipboard, or start typing text to encode or decode."
        }
      />
    </List>
  );
}
