import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { TranslationDetail } from "./components/TranslationDetail";
import { isTargetLanguage, TARGET_LANGUAGES, type TargetLanguage } from "./lib/languages";
import { getTranslatePreferences } from "./lib/preferences";
import { translateText } from "./lib/translate";
import { showTranslateErrorToast } from "./utils/error-toast";

interface TranslateFormValues {
  text: string;
  targetLanguage: string;
}

export default function Command() {
  const preferences = getTranslatePreferences();
  const { push, pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<TranslateFormValues>({
    initialValues: { text: "", targetLanguage: preferences.targetLanguage },
    validation: {
      text: (value) => (value && value.trim() ? undefined : "Enter some text"),
    },
    async onSubmit(values) {
      const targetLanguage: TargetLanguage = isTargetLanguage(values.targetLanguage)
        ? values.targetLanguage
        : preferences.targetLanguage;

      const toast = await showToast({ style: Toast.Style.Animated, title: "Translating…" });

      try {
        const translation = await translateText({ text: values.text, targetLanguage });
        await toast.hide();
        push(
          <TranslationDetail
            translation={translation}
            targetLanguage={targetLanguage}
            model={preferences.model}
            characterCount={values.text.length}
            onTranslateAgain={pop}
          />,
        );
      } catch (error) {
        await toast.hide();
        await showTranslateErrorToast(error);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Translate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        {...itemProps.text}
        title="Text"
        placeholder="Enter text to translate (multi-line supported)"
        autoFocus
        enableMarkdown={false}
      />
      <Form.Dropdown {...itemProps.targetLanguage} title="Target Language">
        {TARGET_LANGUAGES.map((language) => (
          <Form.Dropdown.Item key={language} value={language} title={language} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
