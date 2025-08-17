import { ActionPanel, Action, Form, getPreferenceValues, showToast, Toast, Detail, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { translateByAI } from "./utils";
import { LANGUAGES } from "./constant";

export default function TranslateCommand() {
  const { push } = useNavigation();
  const [server, setServer] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");

  const refreshConfig = () => {
    const preferences = getPreferenceValues<Preferences>();
    setServer(preferences.server);
    setModel(preferences.model);
    setApiKey(preferences.apiKey);
  };

  useEffect(() => {
    refreshConfig();
  }, []);

  async function doTranslate(value: { text: string; target: string }) {
    await showToast(Toast.Style.Animated, "Translating…");
    const res = await translateByAI({
      text: value.text,
      targetLanguage: value.target,
      server,
      modelName: model,
      apiKey,
    });
    console.log("【doTranslate】res:", res);
    push(
      <Detail
        markdown={`
## Original Text
${res.original}

## Translation
${res.translation}
`}
      />,
    );
    showToast(Toast.Style.Success, "Translation completed.");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Translate"
            onSubmit={(value) => doTranslate({ text: value.text, target: value.target })}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" placeholder="Enter text to translate…" />
      <Form.Dropdown id="target" defaultValue="Chinese">
        {LANGUAGES.map((item) => (
          <Form.Dropdown.Item key={item.code} value={item.name} title={item.nativeName} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
