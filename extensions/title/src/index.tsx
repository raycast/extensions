import { ActionPanel, Action, Form, Icon, Clipboard, Detail } from "@raycast/api";
import React, { useState, useEffect } from "react";

import capitalize from "title";

export default function Command() {
  const [loading, setLoading] = useState(true);

  const [input, setInput] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    Clipboard.readText()
      .then((text) => {
        if (text) {
          setInput(text);
          setTitle(capitalize(text));
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Bug Fix: Wait for clipboard, to prevent bug where text couldn't be deleted all at once (only character by character)
  if (loading) {
    return <Detail />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.Paste icon={Icon.ArrowRight} content={title || ""} />
          <Action.CopyToClipboard icon={Icon.Clipboard} content={title || ""} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="text"
        title="Text"
        placeholder={"This is my title"}
        value={input}
        onChange={(text) => {
          setInput(text);
          setTitle(capitalize(text));
        }}
      ></Form.TextField>
      <Form.Description title="Preview" text={title || ""} />
    </Form>
  );
}
