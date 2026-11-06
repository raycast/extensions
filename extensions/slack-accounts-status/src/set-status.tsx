import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import {
  clearStatusPreset,
  customPreset,
  defaultPresets,
  errorMessage,
  PresencePreset,
  presencePresets,
  Preset,
  statusEmojiIcon,
} from "./domain";
import ManageWorkspaces from "./manage-workspaces";
import StatusForm from "./status-form";
import { deletePreset, readAccounts, readPresets } from "./state";
import { useStoredData } from "./use-stored-data";

async function loadData() {
  const [accounts, presets] = await Promise.all([readAccounts(), readPresets()]);
  return { accounts: accounts.filter((account) => account.state === "ready"), presets };
}

export default function SetStatus() {
  const { data, error, loading, reload } = useStoredData(loadData);
  const accounts = data?.accounts ?? [];
  const commonActions = (
    <>
      <Action.Push
        title="Manage Workspaces"
        icon={Icon.PersonCircle}
        target={<ManageWorkspaces navigationTitle="Manage Slack Workspaces" />}
        onPop={reload}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={reload}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </>
  );
  async function remove(preset: Preset) {
    if (
      !(await confirmAlert({
        title: `Delete ${preset.name}?`,
        primaryAction: { title: "Delete Preset", style: Alert.ActionStyle.Destructive },
      }))
    )
      return;
    try {
      await deletePreset(preset.id);
      await reload();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could Not Delete Preset", message: errorMessage(error) });
    }
  }
  function item(preset: Preset | PresencePreset, saved = false) {
    const isCustom = preset.id === customPreset.id;
    const isClear = preset === clearStatusPreset;
    const subtitle =
      "text" in preset
        ? isClear
          ? "Remove status text and emoji"
          : isCustom
            ? "Set your own status"
            : preset.text || "Clear status"
        : preset.description;
    const icon =
      "emoji" in preset
        ? (statusEmojiIcon(preset.emoji) ?? (isClear ? Icon.Eraser : isCustom ? Icon.Pencil : Icon.Message))
        : { source: Icon.CircleFilled, tintColor: preset.presence === "auto" ? Color.Green : Color.Orange };
    const notifications = "notifications" in preset ? preset.notifications : "keep";
    const notificationLabel =
      notifications === "pause"
        ? "Pause Notifications"
        : notifications === "resume"
          ? "End Notification Pause"
          : undefined;
    return (
      <List.Item
        key={preset.id}
        title={preset.name}
        subtitle={subtitle}
        icon={icon}
        accessories={notificationLabel ? [{ text: notificationLabel }] : []}
        actions={
          <ActionPanel>
            <Action.Push
              title="Review Status"
              icon={Icon.Pencil}
              target={<StatusForm accounts={accounts} initial={preset} onPresetSaved={reload} />}
              onPop={reload}
            />
            {commonActions}
            {saved && "text" in preset && (
              <Action
                title="Delete Preset"
                style={Action.Style.Destructive}
                icon={Icon.Trash}
                onAction={() => remove(preset)}
              />
            )}
          </ActionPanel>
        }
      />
    );
  }
  if (error)
    return (
      <Detail
        markdown={`# Could Not Load Status Settings\n\n${error}`}
        actions={<ActionPanel>{commonActions}</ActionPanel>}
      />
    );
  return (
    <List isLoading={loading} searchBarPlaceholder="Search status presets…">
      {accounts.length === 0 && (
        <List.EmptyView
          title="Connect Your Workspaces First"
          description="Open Manage Workspaces to authorize each Slack account. Then apply a status to all or selected workspaces."
          icon={Icon.PersonCircle}
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
      )}
      {accounts.length > 0 && (
        <>
          <List.Section title="Quick Status">
            {presencePresets.map((preset) => item(preset))}
            {item(clearStatusPreset)}
          </List.Section>
          <List.Section title="Presets">
            {defaultPresets.map((preset) => item(preset))}
            {item(customPreset)}
          </List.Section>
          {(data?.presets.length ?? 0) > 0 && (
            <List.Section title="Saved Presets">{data?.presets.map((preset) => item(preset, true))}</List.Section>
          )}
        </>
      )}
    </List>
  );
}
