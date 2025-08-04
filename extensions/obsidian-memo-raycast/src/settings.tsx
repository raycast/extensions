import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useSettings } from "./hooks/useSettings";
import { TEXTS } from "./constants/texts";

export default function Settings(): JSX.Element {
  const {
    settings,
    isLoading,
    isSettingsLoaded,
    updateSetting,
    handleSubmit,
    handleReset,
  } = useSettings();
  const { pop } = useNavigation();

  const onSubmit = async (values: typeof settings): Promise<void> => {
    const success = await handleSubmit(values);
    if (success) {
      pop();
    }
  };

  const onReset = async (): Promise<void> => {
    await handleReset();
  };

  if (!isSettingsLoaded) {
    return (
      <Form
        isLoading={true}
        actions={
          <ActionPanel>
            <Action title="Loading" />
          </ActionPanel>
        }
      >
        <Form.Description text="loadin config...." />
      </Form>
    );
  }
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={TEXTS.settings.actions.save}
            icon="💾"
            onSubmit={onSubmit}
          />
          <Action
            title={TEXTS.settings.actions.reset}
            icon="🔄"
            style={Action.Style.Destructive}
            onAction={onReset}
          />
          <Action
            title={TEXTS.settings.actions.cancel}
            icon="❌"
            shortcut={{ modifiers: ["cmd"], key: "escape" }}
            onAction={pop}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={TEXTS.settings.description} />

      <Form.Separator />

      <Form.TextField
        id="obsidianVaultPath"
        title={TEXTS.settings.fields.obsidianVaultPath.title}
        placeholder={TEXTS.settings.fields.obsidianVaultPath.placeholder}
        value={settings.obsidianVaultPath}
        onChange={(value) => updateSetting("obsidianVaultPath", value)}
        info={TEXTS.settings.fields.obsidianVaultPath.info}
      />

      <Form.TextField
        id="dailyNotesPath"
        title={TEXTS.settings.fields.dailyNotesPath.title}
        placeholder={TEXTS.settings.fields.dailyNotesPath.placeholder}
        value={settings.dailyNotesPath}
        onChange={(value) => updateSetting("dailyNotesPath", value)}
        info={TEXTS.settings.fields.dailyNotesPath.info}
      />

      <Form.TextField
        id="templatePath"
        title={TEXTS.settings.fields.templatePath.title}
        placeholder={TEXTS.settings.fields.templatePath.placeholder}
        value={settings.templatePath}
        onChange={(value) => updateSetting("templatePath", value)}
        info={TEXTS.settings.fields.templatePath.info}
      />

      <Form.TextField
        id="journalSection"
        title={TEXTS.settings.fields.journalSection.title}
        placeholder={TEXTS.settings.fields.journalSection.placeholder}
        value={settings.journalSection}
        onChange={(value) => updateSetting("journalSection", value)}
        info={TEXTS.settings.fields.journalSection.info}
      />

      <Form.TextArea
        id="entryFormat"
        title={TEXTS.settings.fields.entryFormat.title}
        placeholder={TEXTS.settings.fields.entryFormat.placeholder}
        value={settings.entryFormat}
        onChange={(value) => updateSetting("entryFormat", value)}
        info={TEXTS.settings.fields.entryFormat.info}
      />

      <Form.Separator />

      <Form.Dropdown
        id="insertPosition"
        title={TEXTS.settings.fields.insertPosition.title}
        value={settings.insertPosition}
        onChange={(value) =>
          updateSetting("insertPosition", value as "top" | "bottom")
        }
        info={TEXTS.settings.fields.insertPosition.info}
      >
        <Form.Dropdown.Item
          value="bottom"
          title={TEXTS.settings.fields.insertPosition.options.bottom}
        />
        <Form.Dropdown.Item
          value="top"
          title={TEXTS.settings.fields.insertPosition.options.top}
        />
      </Form.Dropdown>

      <Form.Checkbox
        id="autoCreateTemplate"
        title={TEXTS.settings.fields.autoCreateTemplate.title}
        label={TEXTS.settings.fields.autoCreateTemplate.label}
        value={settings.autoCreateTemplate}
        onChange={(value) => updateSetting("autoCreateTemplate", value)}
        info={TEXTS.settings.fields.autoCreateTemplate.info}
      />

      <Form.Checkbox
        id="showSuccessNotification"
        title={TEXTS.settings.fields.showSuccessNotification.title}
        label={TEXTS.settings.fields.showSuccessNotification.label}
        value={settings.showSuccessNotification}
        onChange={(value) => updateSetting("showSuccessNotification", value)}
        info={TEXTS.settings.fields.showSuccessNotification.info}
      />
    </Form>
  );
}
