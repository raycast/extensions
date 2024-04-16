import { Action, ActionPanel, Clipboard, Detail } from "@raycast/api";
import { useEffect, useState } from "react";

export default function TsToDate() {
  const [text, setText] = useState("");

  useEffect(() => {
    Clipboard.readText().then((text) => {
      try {
        const ts = Number.parseInt(text ?? "");
        const date = new Date(ts);
        const str = date.toString();
        if (str.includes("NaN") || str.includes("Invalid Date")) {
          setText(`## Invalid timestamp to parse:\n\n${text}`);
          return;
        }
        setText(`## ${str}`);
      } catch (error) {
        setText(`## Invalid timestamp to parse:\n\n${text}`);
      }
    });
  }, []);

  return (
    <>
      <Detail
        markdown={text}
        actions={
          <ActionPanel title="Timestamps">
            <Action.Paste title="Paste Date" content={text.substring(3)} />
          </ActionPanel>
        }
      />
    </>
  );
}
