import { List, Action, ActionPanel, useNavigation, Detail } from "@raycast/api";
import { useState } from "react";
import { createHash } from "crypto";

interface Result {
  title: string;
  value: string;
}

function useConvert() {
  const [state, setState] = useState<{ [key: string]: Result[] }>({});

  function convert(value: string) {
    if (value) {
      setState({
        Base64: [
          { title: "Encoded", value: Buffer.from(value, "binary").toString("base64") },
          { title: "Decoded", value: Buffer.from(value, "base64").toString("binary") },
        ],
        URL: [
          {
            title: "Encoded",
            value: (() => {
              try {
                return encodeURI(value);
              } catch {
                return "N/A";
              }
            })(),
          },
          {
            title: "Decoded",
            value: (() => {
              try {
                return decodeURI(value);
              } catch {
                return "N/A";
              }
            })(),
          },
        ],
        Hash: [
          { title: "MD5", value: createHash("md5").update(value, "utf8").digest("hex") },
          { title: "SHA1", value: createHash("sha1").update(value, "utf8").digest("hex") },
          { title: "SHA256", value: createHash("sha256").update(value, "utf8").digest("hex") },
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
  const { push } = useNavigation();
  const { state, convert } = useConvert();

  return (
    <List searchBarPlaceholder="Enter a string..." onSearchTextChange={convert}>
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
                  <Action title="Detail" onAction={() => push(<Detail markdown={item.value} />)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
