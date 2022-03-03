import { List, Action, ActionPanel } from "@raycast/api";
import { useState } from "react";

function useConvert() {
  const [state, setState] = useState<{ [key: string]: string }>({});

  function convert(value: string) {
    if (value) {
      const number = Number(value);
      if (number) {
        setState({
          IPv4: `${(number >> 24) & 0xff}.${(number >> 16) & 0xff}.${(number >> 8) & 0xff}.${number & 0xff}`,
        });
      } else {
        setState({
          IPv4: value
            .split(".")
            .map(parseFloat)
            .reduce((sum, item) => sum * 256 + item)
            .toString(),
        });
      }
    } else {
      setState({});
    }
  }

  return {
    state: state,
    convert: convert,
  };
}

export default function Command() {
  const { state, convert } = useConvert();

  return (
    <List searchBarPlaceholder="Enter a value..." onSearchTextChange={convert}>
      {Object.entries(state).map(([key, value], index) => (
        <List.Section key={index} title={key}>
          <List.Item
            key={index}
            title={value}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={value} />
              </ActionPanel>
            }
          />
        </List.Section>
      ))}
    </List>
  );
}
