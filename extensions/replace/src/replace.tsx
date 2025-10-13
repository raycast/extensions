import { Form, ActionPanel, Action, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";

export default async function Command() {
  const [oldClipBoardText, setOldClipBoardText] = useState("");
  const [oldValue, setOldValue] = useState("");
  const [newValue, setNewValue] = useState("");

  useEffect(() => {
    const fetchOldClipBoardText = async () => {
      const text = await Clipboard.readText();
      if (text) {
        setOldClipBoardText(text);
      }
    };
    fetchOldClipBoardText();
  }, []);

  const handleOldValueChange = (value: string) => {
    setOldValue(value);
  };

  const handleSubmit = (values: { old: string; new: string }) => {
    const escapeRegExp = (string: string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };
    const newClipBoardText = oldClipBoardText.replace(new RegExp(escapeRegExp(values.old), "g"), values.new);
    Clipboard.paste(newClipBoardText);
  };

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Replace" onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextField id="old" title="Old" autoFocus value={oldValue} onChange={handleOldValueChange} />
        <Form.TextField id="new" title="New" value={newValue} onChange={setNewValue} />
      </Form>
    </>
  );
}
