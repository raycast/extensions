import { Form, ActionPanel, OpenInBrowserAction } from "@raycast/api";
import { colors, languages } from "./constants";
import { useState } from "react";

interface Values {
  title: string;
  background: string;
  darkMode: string;
  padding: string;
  language: string;
  snippet: string;
  color: string;
}
const defaultSnippet: Values = {
  title: "Untitled 1",
  background: "true",
  darkMode: "true",
  padding: "16",
  language: "auto",
  snippet: "",
  color: "candy",
};

export default function CreateSnippet() {
  const [code, setCode] = useState<Values>(defaultSnippet);
  const url = `https://ray.so/?colors=${code.color}&background=${code.background}&darkMode=${code.darkMode}&padding=${
    code.padding
  }&title=${code.title || "Untitled 1"}&code=${Buffer.from(code.snippet).toString("base64")}&language=${code.language}`;

  return (
    <Form
      actions={
        <ActionPanel>
          <OpenInBrowserAction title="Create Snippet"  url={url} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Untitled 1"
        onChange={(title) => setCode({ ...code, title })}
      />
      <Form.TextArea
        id="code"
        title="Code"
        placeholder="Paste your code here"
        onChange={(snippet) => setCode({ ...code, snippet })}
      />
      <Form.Separator />
      <Form.Dropdown id="color" title="Color" storeValue onChange={(color) => setCode({ ...code, color })}>
        {colors.map((el, idx) => (
          <Form.Dropdown.Item
            key={idx}
            icon={{ source: `${el}.png` }}
            value={el}
            title={el.charAt(0).toUpperCase() + el.substring(1).toLowerCase()}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="langauge" title="Language" storeValue onChange={(language) => setCode({ ...code, language })}>
        {languages.map((el, idx) => (
          <Form.Dropdown.Item key={idx} value={el.value} title={el.label} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="background"
        title="Background"
        storeValue
        onChange={(background) => setCode({ ...code, background })}
      >
        <Form.Dropdown.Item value="true" title="Yes" />
        <Form.Dropdown.Item value="false" title="No" />
      </Form.Dropdown>
      <Form.Dropdown id="darkMode" title="Dark Mode" storeValue onChange={(darkMode) => setCode({ ...code, darkMode })}>
        <Form.Dropdown.Item value="true" title="Yes" />
        <Form.Dropdown.Item value="false" title="No" />
      </Form.Dropdown>
      <Form.Dropdown id="padding" title="Padding" storeValue onChange={(padding) => setCode({ ...code, padding })}>
        <Form.Dropdown.Item value="16" title="16" />
        <Form.Dropdown.Item value="32" title="32" />
        <Form.Dropdown.Item value="64" title="64" />
        <Form.Dropdown.Item value="128" title="128" />
      </Form.Dropdown>
    </Form>
  );
}
