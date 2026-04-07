import { Form, ActionPanel, Action, useNavigation, showToast, Toast, Icon } from "@raycast/api";

import type { Settings } from "../hooks/useSettings";
import type { Lang, Translations } from "../i18n/translations";
import { SUPPORTED_COUNTRIES } from "../utils/countries";

interface SettingsFormProps {
  settings: Settings;
  isFirstRun?: boolean;
  t: Translations;
  onSave: (settings: Settings) => Promise<void>;
}

interface FormValues {
  usagePct: string;
  requestCost: string;
  language: string;
  country: string;
}

const LANGUAGES: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
];

export function SettingsForm({ settings, isFirstRun = false, t, onSave }: SettingsFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    const usagePct = parseInt(values.usagePct, 10);
    if (isNaN(usagePct) || usagePct < 0 || usagePct > 100) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.validationInvalidUsage,
        message: t.validationInvalidUsageMsg,
      });
      return;
    }

    const requestCost = parseFloat(values.requestCost);
    if (isNaN(requestCost) || requestCost <= 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.validationInvalidCost,
        message: t.validationInvalidCostMsg,
      });
      return;
    }

    await onSave({
      usagePct,
      requestCost,
      language: values.language as Lang,
      country: values.country,
    });

    if (!isFirstRun) pop();
  }

  return (
    <Form
      navigationTitle={isFirstRun ? t.formTitleFirstRun : t.formTitleSettings}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.formSubmitButton} icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={t.formDesc(settings.requestCost)} />
      <Form.TextField
        id="usagePct"
        title={t.formUsageLabel}
        placeholder={t.formUsagePlaceholder}
        defaultValue={String(settings.usagePct)}
        info={t.formUsageInfo}
      />
      <Form.Separator />
      <Form.TextField
        id="requestCost"
        title={t.formCostLabel}
        placeholder={t.formCostPlaceholder}
        defaultValue={String(settings.requestCost)}
        info={t.formCostInfo}
      />
      <Form.Separator />
      <Form.Dropdown id="language" title={t.formLanguageLabel} defaultValue={settings.language}>
        {LANGUAGES.map((lang) => (
          <Form.Dropdown.Item key={lang.code} value={lang.code} title={lang.label} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="country" title={t.formCountryLabel} defaultValue={settings.country}>
        {SUPPORTED_COUNTRIES.map((c) => (
          <Form.Dropdown.Item key={c.code} value={c.code} title={`${c.names[settings.language]} (${c.code})`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
