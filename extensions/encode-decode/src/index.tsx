import { Action, ActionPanel, List } from "@raycast/api";
import { useEffect, useState } from "react";

export default function Command() {
  const [input, setInput] = useState("hello world");

  const [base64Encoded, setBase64Encoded] = useState("");
  const [urlEncoded, setUrlEncoded] = useState("");

  const [base64Decoded, setBase64Decoded] = useState("");
  const [urlDecoded, setUrlDecoded] = useState("");

  useEffect(() => {
    setBase64Encoded(Buffer.from(input).toString("base64"));
    setUrlEncoded(encodeURI(input));
    setBase64Decoded(Buffer.from(input, "base64").toString("ascii"));
    setUrlDecoded(decodeURI(input));
  }, [input]);

  return (
    <List searchBarPlaceholder={input} onSearchTextChange={setInput}>
      <List.Section title="encode">
        <List.Item
          title={base64Encoded}
          subtitle="base64"
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={base64Encoded} />
            </ActionPanel>
          }
        />
        <List.Item
          title={urlEncoded}
          subtitle="url"
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={urlEncoded} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="decode">
        <List.Item
          title={base64Decoded}
          subtitle="base64"
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={base64Decoded} />
            </ActionPanel>
          }
        />
        <List.Item
          title={urlDecoded}
          subtitle="url"
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={urlDecoded} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
