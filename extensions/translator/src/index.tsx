import { ActionPanel, Action, Form, getPreferenceValues, showToast, Toast, Detail, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { translateByAI } from "./utils";
import { LANGUAGES } from "./constant";
import { showFailureToast } from "@raycast/utils";

export default function TranslateCommand() {
  const { push } = useNavigation();
  const [server, setServer] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [targetLanguage, setTargetLanguage] = useState<string>("");

  const refreshConfig = () => {
    const preferences = getPreferenceValues<Preferences>();
    setServer(preferences.server);
    setModel(preferences.model);
    setApiKey(preferences.apiKey);
  };

  useEffect(() => {
    refreshConfig();
  }, []);

  async function doTranslate() {
    await showToast(Toast.Style.Animated, "Translating…");
    try {
      const res = await translateByAI({
        text: searchText,
        targetLanguage,
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
    } catch (error) {
      console.log("【doTranslate】error:", error);
      showFailureToast(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Translate" onSubmit={() => doTranslate()} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" placeholder="Enter text to translate…" value={searchText} onChange={setSearchText} />
      <Form.Dropdown id="target" value={targetLanguage} onChange={setTargetLanguage}>
        {LANGUAGES.map((item) => (
          <Form.Dropdown.Item key={item.code} value={item.name} title={item.nativeName} />
        ))}
      </Form.Dropdown>
      {targetLanguage === "Custom" && <Form.TextField id="customLanguage" title="Custom language" />}
    </Form>
  );
}
