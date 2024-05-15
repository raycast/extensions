import { Form, ActionPanel, closeMainWindow, showToast, Action, Toast, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import open from "open";
import { encodeURI } from "js-base64";

interface Values {
  title: string;
  background: string;
  darkMode: string;
  padding: string;
  language: string;
  snippet: string;
  color: string;
}
interface Data {
  languages: { id: string; name: string }[];
  themes: { id: string; name: string; iconUrl?: string; partner?: boolean }[];
  padding: number[];
}
const defaultSnippet: Values = {
  title: "Untitled%201",
  background: "true",
  darkMode: "true",
  padding: "16",
  language: "auto",
  snippet: "",
  color: "candy",
};

export default function CreateSnippet() {
  const [code, setCode] = useState<Values>(defaultSnippet);
  const { data: data } = useFetch<Data>("https://ray.so/api/config");
  const url = `https://ray.so/#theme=${code.color}&background=${code.background}&darkMode=${code.darkMode}&padding=${
    code.padding
  }&title=${code.title || "Untitled%201"}&code=${encodeURI(code.snippet)}&language=${code.language}`;

  const handleSubmit = async () => {
    if (!code.snippet) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing Code",
        message: "Code cannot be empty",
      });
      return;
    }
    open(url);
    closeMainWindow();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Snippet" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Untitled 1"
        onChange={(title) => setCode({ ...code, title: title.replace(/ /g, "%20").trim() })}
      />
      <Form.TextArea
        id="code"
        title="Code"
        placeholder="Paste your code here"
        onChange={(snippet) => setCode({ ...code, snippet })}
      />
      <Form.Separator />
      <Form.Dropdown
        id="color"
        title="Color"
        storeValue
        defaultValue={data ? defaultSnippet.color : undefined}
        onChange={(color) => setCode({ ...code, color })}
        isLoading={!data}
      >
        <Form.Dropdown.Section title="Partners">
          {data?.themes.map(
            (theme) =>
              theme.partner && (
                <Form.Dropdown.Item
                  key={theme.id}
                  icon={{
                    source: `${theme.iconUrl}`,
                    tintColor: ["vercel", "rabbit"].includes(theme.id) ? Color.PrimaryText : undefined,
                  }}
                  value={theme.id}
                  title={theme.name}
                />
              ),
          )}
        </Form.Dropdown.Section>
        {data?.themes.map(
          (theme) =>
            !theme.partner && (
              <Form.Dropdown.Item
                key={theme.id}
                icon={{ source: `${theme.id}.png` }}
                value={theme.id}
                title={theme.name}
              />
            ),
        )}
      </Form.Dropdown>
      <Form.Dropdown
        id="language"
        title="Language"
        storeValue
        defaultValue={defaultSnippet.language}
        onChange={(language) => setCode({ ...code, language })}
        isLoading={!data}
      >
        <Form.Dropdown.Item value="auto" title="Auto-Detect" />
        {data?.languages.map((el: { id: string; name: string }, idx: number) => (
          <Form.Dropdown.Item key={idx} value={el.id} title={el.name} />
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
      <Form.Dropdown
        id="padding"
        title="Padding"
        storeValue
        onChange={(padding) => setCode({ ...code, padding })}
        isLoading={!data}
      >
        {data?.padding.map((el: number, idx: number) => (
          <Form.Dropdown.Item key={idx} value={el.toString()} title={el.toString()} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
