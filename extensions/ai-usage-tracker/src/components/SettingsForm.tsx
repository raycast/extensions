import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";

import type { Settings } from "../hooks/useSettings";
import { contentText } from "../utils/content-text";
import { SUPPORTED_COUNTRIES } from "../utils/countries";

interface SettingsFormProps {
  settings: Settings;
  isFirstRun?: boolean;
  onSave: (settings: Settings) => Promise<void>;
}

interface FormValues {
  usagePct: string;
  requestCost: string;
  country: string;
}

export function SettingsForm({ settings, isFirstRun = false, onSave }: SettingsFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    const usagePct = parseInt(values.usagePct, 10);
    if (isNaN(usagePct) || usagePct < 0 || usagePct > 100) {
      await showToast({
        style: Toast.Style.Failure,
        title: contentText.validationInvalidUsage,
        message: contentText.validationInvalidUsageMsg,
      });
      return;
    }

    const requestCost = parseFloat(values.requestCost);
    if (isNaN(requestCost) || requestCost <= 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: contentText.validationInvalidCost,
        message: contentText.validationInvalidCostMsg,
      });
      return;
    }

    await onSave({
      usagePct,
      requestCost,
      country: values.country,
    });

    if (!isFirstRun) pop();
  }

  return (
    <Form
      navigationTitle={isFirstRun ? contentText.formTitleFirstRun : contentText.formTitleSettings}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={contentText.formSubmitButton} icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={contentText.formDesc(settings.requestCost)} />
      <Form.TextField
        id="usagePct"
        title={contentText.formUsageLabel}
        placeholder={contentText.formUsagePlaceholder}
        defaultValue={String(settings.usagePct)}
        info={contentText.formUsageInfo}
      />
      <Form.Separator />
      <Form.TextField
        id="requestCost"
        title={contentText.formCostLabel}
        placeholder={contentText.formCostPlaceholder}
        defaultValue={String(settings.requestCost)}
        info={contentText.formCostInfo}
      />
      <Form.Separator />
      <Form.Dropdown id="country" title={contentText.formCountryLabel} defaultValue={settings.country}>
        {SUPPORTED_COUNTRIES.map((c) => (
          <Form.Dropdown.Item key={c.code} value={c.code} title={`${c.name} (${c.code})`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
