import { Action, ActionPanel, Form, useNavigation, showToast, Toast } from "@raycast/api";
import { useI18n } from "../hooks/useI18n";
import { getLanguageName, AVAILABLE_LANGUAGES, Language } from "../utils/i18n";

export default function LanguageSettings() {
  const { pop } = useNavigation();
  const { t, language, setLanguage } = useI18n();

  return (
    <Form
      navigationTitle={t("settings.general.language.title")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("settings.general.language.select")}
            onSubmit={async (values: { language: Language }) => {
              setLanguage(values.language);
              await showToast({ style: Toast.Style.Success, title: t("settings.toasts.appUpdated") });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="language" title={t("settings.general.language.title")} defaultValue={language}>
        {AVAILABLE_LANGUAGES.map((lang) => (
          <Form.Dropdown.Item key={lang} value={lang} title={getLanguageName(lang)} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
