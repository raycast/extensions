import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { count } from "./lib/count";
import { readFromSelection, readFromClipboard } from "./utils";

export default function Command() {
  const [text, setText] = useState("");
  const [includeWhitespace, setIncludeWhitespace] = useState(true);
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    (async () => {
      let content = await readFromSelection();

      if (!content) {
        content = await readFromClipboard();
      }

      setText(content);
    })();
  }, []);

  useEffect(() => {
    const result = count(text, includeWhitespace);
    const resultStr = `${result.characters} characters · ${result.words} words \n${result.sentences} sentences · ${result.paragraphs} paragraphs \n${result.reading_time} minutes to read · ${result.speaking_time} minutes to speak`;
    setResult(resultStr);
  }, [text, includeWhitespace]);

  const actions = (
    <ActionPanel>
      <Action
        title="Toggle Whitespace"
        onAction={() => setIncludeWhitespace(!includeWhitespace)}
        shortcut={{
          modifiers: ["cmd"],
          key: "t",
        }}
        icon={Icon.Switch}
      />
      <Action
        title="Clear Text"
        onAction={() => setText("")}
        shortcut={{
          modifiers: ["cmd"],
          key: "e",
        }}
        icon={Icon.Trash}
      />
    </ActionPanel>
  );

  return (
    <Form actions={actions}>
      <Form.Description text={result} />
      <Form.TextArea id="text" title="Text to Count" placeholder="Start typing..." value={text} onChange={setText} />
      <Form.Checkbox
        id="include-whitespace"
        title="Options"
        label="Include whitespace in character count"
        value={includeWhitespace}
        onChange={setIncludeWhitespace}
      />
    </Form>
  );
}
