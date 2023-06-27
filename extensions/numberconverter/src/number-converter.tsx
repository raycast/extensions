import { useEffect, useState } from "react";
import { Action, ActionPanel, List } from "@raycast/api";

function isHex(value: string): boolean {
  const hexRegex = /^[0-9A-Fa-f]+$/;
  return hexRegex.test(value);
}

function isDec(value: string): boolean {
  const hexRegex = /^[0-9]+$/;
  return hexRegex.test(value);
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [value, setValue] = useState(BigInt(0));
  const [valid, setValid] = useState(true);

  useEffect(() => {
    let text = searchText;
    if (!isDec(text) && isHex(text)) {
      text = "0x" + text;
    }
    try {
      setValue(BigInt(text));
      setValid(true);
    } catch (error) {
      setValid(false);
    }
  }, [searchText]);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Number Converter"
      searchBarPlaceholder="0xdeadbeef"
    >
      {valid && (
        <>
          <List.Item
            title={value.toString(16)}
            icon="hex.png"
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={value.toString(16)} />
              </ActionPanel>
            }
            accessories={[{ tag: "Hex" }]}
          />
          <List.Item
            title={value.toString()}
            icon="decimal.png"
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={value.toString()} />
              </ActionPanel>
            }
            accessories={[{ tag: "Dec" }]}
          />
          <List.Item
            title={value.toString(8)}
            icon="octal.png"
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={value.toString(8)} />
              </ActionPanel>
            }
            accessories={[{ tag: "Oct" }]}
          />
          <List.Item
            title={value.toString(2)}
            icon="binary.png"
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={value.toString(2)} />
              </ActionPanel>
            }
            accessories={[{ tag: "Bin" }]}
          />
        </>
      )}
    </List>
  );
}
