import { Form, ActionPanel, Action, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";

export default function Command() {
  const [nameError, setNameError] = useState<string | undefined>();
  const [codeError, setCodeError] = useState<string | undefined>();
  const [name, setName] = useState<string>("CodeSnap Raycast Snippet");
  const [code, setCode] = useState<string>("");
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    Clipboard.readText().then((text) => {
      setCode(text ?? "");
    });
  });

  useEffect(() => {
    setUrl(`https://codesnap.dev/editor?code=${encodeURIComponent(code)}&name=${encodeURIComponent(name)}&tag=Raycast`);
  }, [name, code]);

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  function dropCodeErrorIfNeeded() {
    if (codeError && codeError.length > 0) {
      setCodeError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} />
        </ActionPanel>
      }
    >
      <Form.Description text="Prepare your code snippet" />
      <Form.TextField
        id="name"
        title="Name of your code snippet"
        error={nameError}
        value={name}
        placeholder="Enter name"
        onChange={(newValue) => {
          setName(newValue);
          dropNameErrorIfNeeded();
        }}
        onBlur={(event) => {
          const value = event.target.value;
          if (!value || value.length === 0) {
            setNameError("The field shouldn't be empty!");
          }
        }}
      />
      <Form.TextArea
        id="code"
        title="Your code"
        error={codeError}
        placeholder="Paste your code here"
        value={code}
        onChange={(newValue) => {
          setCode(newValue);
          dropCodeErrorIfNeeded();
        }}
        onBlur={(event) => {
          const value = event.target.value;
          if (!value || value.length === 0) {
            setCodeError("The field shouldn't be empty!");
          }
        }}
      />
    </Form>
  );
}
