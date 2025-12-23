import { Action, ActionPanel, Form, Icon, List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { formatMiseError, listSettings, updateSetting, MiseSetting } from "./tools/mise";

export default function SettingsCommand() {
  const { data, isLoading, error, revalidate } = usePromise(listSettings, []);
  const settings = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter settings" throttle>
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to load settings"
          description={formatMiseError(error)}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : null}
      {!error && settings.length === 0 ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No settings found"
          description="mise is currently using default configuration values."
        />
      ) : null}
      {settings.map((setting) => (
        <SettingItem key={setting.key} setting={setting} onRefresh={revalidate} />
      ))}
    </List>
  );
}

function getSettingIcon(key: string) {
  if (key.includes("experimental")) return Icon.Beaker;
  if (key.includes("verbose") || key.includes("debug") || key.includes("log")) return Icon.Terminal;
  if (key.includes("jobs")) return Icon.Layers;
  if (key.includes("shim")) return Icon.Link;
  if (key.includes("plugin")) return Icon.Plug;
  if (key.includes("legacy")) return Icon.Clock;
  if (key.includes("yes")) return Icon.Check;
  return Icon.Gear;
}

function SettingItem({ setting, onRefresh }: { setting: MiseSetting; onRefresh: () => void }) {
  const isBoolean = setting.value === "true" || setting.value === "false";
  const nextBooleanValue = setting.value === "true" ? "false" : "true";

  return (
    <List.Item
      title={setting.key}
      subtitle={setting.value}
      icon={getSettingIcon(setting.key)}
      accessories={setting.source ? [{ icon: Icon.Document, tooltip: `Defined in ${setting.source}` }] : undefined}
      actions={
        <ActionPanel>
          {isBoolean ? (
            <Action
              title={`Toggle ${setting.key}`}
              icon={setting.value === "true" ? Icon.ToggleOn : Icon.ToggleOff}
              onAction={async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: `Setting ${setting.key}=${nextBooleanValue}`,
                });
                try {
                  await updateSetting(setting.key, nextBooleanValue);
                  toast.style = Toast.Style.Success;
                  toast.title = `${setting.key}=${nextBooleanValue}`;
                  onRefresh();
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = `Failed to update ${setting.key}`;
                  toast.message = formatMiseError(error);
                }
              }}
            />
          ) : null}
          <Action.Push
            title="Edit Value"
            icon={Icon.Pencil}
            target={<SettingEditor setting={setting} onRefresh={onRefresh} />}
          />
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Setting" content={`${setting.key}=${setting.value}`} />
            <Action.CopyToClipboard title="Copy Value" content={setting.value} />
            <Action.CopyToClipboard title="Copy Key" content={setting.key} />
          </ActionPanel.Section>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => {
              onRefresh();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function SettingEditor({ setting, onRefresh }: { setting: MiseSetting; onRefresh: () => void }) {
  const [value, setValue] = useState(setting.value);

  async function handleSubmit(values: { value: string }) {
    const trimmed = values.value.trim();
    const toast = await showToast({ style: Toast.Style.Animated, title: `Setting ${setting.key}` });
    try {
      await updateSetting(setting.key, trimmed);
      toast.style = Toast.Style.Success;
      toast.title = `${setting.key}=${trimmed}`;
      onRefresh();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to update ${setting.key}`;
      toast.message = formatMiseError(error);
    }
  }

  return (
    <Form
      navigationTitle={`Update ${setting.key}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Setting" onSubmit={handleSubmit} icon={Icon.SaveDocument} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Edit the configuration value for '${setting.key}'.`} />
      <Form.TextField id="value" title="Value" value={value} onChange={setValue} placeholder="Enter new value..." />

      <Form.Separator />

      <Form.Description text="Current Configuration:" />
      <Form.Description title="Key" text={setting.key} />
      <Form.Description title="Current Value" text={setting.value} />
      {setting.source ? <Form.Description title="Defined In" text={setting.source} /> : null}
    </Form>
  );
}
