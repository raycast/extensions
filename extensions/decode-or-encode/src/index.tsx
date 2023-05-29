import React from "react";
import { List, ActionPanel, Action, Icon, getPreferenceValues, Clipboard } from "@raycast/api";
import run_all_processors from "./util";

interface Preferences {
  pasteOnFinish: boolean;
}

export default function Command() {
  const [input, setInput] = React.useState("");
  const [state, setState] = React.useState<string[][]>([]);
  React.useEffect(() => {
    setState(run_all_processors(input));
  }, [input]);

  const preferences = getPreferenceValues<Preferences>();

  return (
    <List onSearchTextChange={setInput} searchBarPlaceholder={"Text to encode / decode..."}>
      <>
        <List.Section title={`Input: ${input}`}>
          {state.map((item) => (
            <List.Item
              key={item[0]}
              icon={Icon.CodeBlock}
              title={item[0]}
              subtitle={item[1]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    key="copyToClipboard"
                    content={item[1]}
                    onCopy={(content) => preferences.pasteOnFinish && Clipboard.paste(content)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </>
    </List>
  );
}
