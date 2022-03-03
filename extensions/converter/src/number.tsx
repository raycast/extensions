import { List, Action, ActionPanel } from "@raycast/api";
import { useState } from "react";

interface Result {
  title: string;
  value: string;
}

function useConvert() {
  const [state, setState] = useState<{ [key: string]: Result[] }>({});

  function convert(value: string) {
    const number = Number(value);
    if (number) {
      setState({
        Basic: [
          { title: "Bin", value: number.toString(2) },
          { title: "Oct", value: number.toString(8) },
          { title: "Dec", value: number.toString(10) },
          { title: "Hex", value: `0x${number.toString(16)}` },
        ],
        Endian: [
          {
            title: "16 Bit",
            value: (((number & 0xff) << 8) | ((number >> 8) & 0xff)).toString(),
          },
          {
            title: "32 Bit",
            value: (
              ((number & 0xff) << 24) |
              ((number & 0xff00) << 8) |
              ((number >> 8) & 0xff00) |
              ((number >> 24) & 0xff)
            ).toString(),
          },
        ],
      });
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
    <List searchBarPlaceholder="Enter a number..." onSearchTextChange={convert}>
      {Object.entries(state).map(([key, value], index) => (
        <List.Section key={index} title={key}>
          {value.map((item, index) => (
            <List.Item
              key={index}
              title={item.title}
              accessoryTitle={item.value}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard content={item.value} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
