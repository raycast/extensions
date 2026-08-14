import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { languageName, sourceLanguageCode, TARGET_LANGUAGE_CODES } from "./languages";
import { LanguagePreferences, saveLanguagePreferences } from "./preferences";

const GET_API_KEY_TITLE = "Get DeepL API Key";

type LanguageSetupProps = {
  initialPreferences?: LanguagePreferences;
  onSaved: (preferences: LanguagePreferences) => void | Promise<void>;
};

export function LanguageSetup({ initialPreferences, onSaved }: LanguageSetupProps) {
  async function handleSubmit(values: LanguagePreferences) {
    if (sourceLanguageCode(values.primaryLanguage) === sourceLanguageCode(values.secondaryLanguage)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Choose two different languages",
      });
      return;
    }

    await saveLanguagePreferences(values);
    await showToast({ style: Toast.Style.Success, title: "Languages saved" });
    await onSaved(values);
  }

  return (
    <Form
      navigationTitle="Set Up DeepL Tools"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Languages" icon={Icon.Checkmark} onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            title={GET_API_KEY_TITLE}
            icon={Icon.Link}
            url="https://www.deepl.com/your-account/keys"
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Your Language Pair"
        text="Choose the two languages you use most. DeepL Tools detects the direction automatically. Your API key stays in Raycast's secure extension preferences."
      />
      <Form.Dropdown
        id="primaryLanguage"
        title="Primary Language"
        defaultValue={initialPreferences?.primaryLanguage || "RU"}
      >
        {TARGET_LANGUAGE_CODES.map((code) => (
          <Form.Dropdown.Item key={code} value={code} title={languageName(code)} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="secondaryLanguage"
        title="Secondary Language"
        defaultValue={initialPreferences?.secondaryLanguage || "EN-US"}
      >
        {TARGET_LANGUAGE_CODES.map((code) => (
          <Form.Dropdown.Item key={code} value={code} title={languageName(code)} />
        ))}
      </Form.Dropdown>
      <Form.Description
        title="DeepL API Free"
        text="Create a free DeepL API account at deepl.com/your-account/keys, then paste its Authentication Key into this extension's preferences."
      />
    </Form>
  );
}
