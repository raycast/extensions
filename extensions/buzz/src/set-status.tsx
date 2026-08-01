import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getClient } from "./lib/preferences";
import { errorMessage } from "./lib/errors";
import { ErrorView } from "./components/error-view";
import { StatusForm } from "./components/status-form";
import { listPresets, createPreset, updatePreset, deletePreset, StatusPreset } from "./lib/presets";

export default function Command() {
  const { pop } = useNavigation();
  const { isLoading, data, error, revalidate } = usePromise(async () => {
    const client = getClient();
    // Presets are local, so they always resolve even when the relay is unreachable.
    // getStatus() failing on its own (relay down) is reported inline on the
    // Current Status row rather than replacing the whole list, so the presets
    // stay usable. A getClient() throw (misconfiguration) still falls through
    // to the full ErrorView below, since it rejects this promise outright.
    const presets = await listPresets();
    let status: Awaited<ReturnType<typeof client.getStatus>> = null;
    let statusError: string | null = null;
    try {
      status = await client.getStatus();
    } catch (e) {
      statusError = errorMessage(e);
    }
    return { presets, status, statusError };
  });

  if (error) {
    return <ErrorView error={error} />;
  }

  async function apply(emoji: string, text: string): Promise<boolean> {
    try {
      await getClient().setStatus(text, emoji || undefined);
      await showToast({ style: Toast.Style.Success, title: "Status updated" });
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Could not set status", message: errorMessage(e) });
      return false;
    }
    revalidate();
    return true;
  }

  async function clear(): Promise<void> {
    try {
      await getClient().clearStatus();
      await showToast({ style: Toast.Style.Success, title: "Status cleared" });
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Could not clear status", message: errorMessage(e) });
      return;
    }
    revalidate();
  }

  async function removePreset(id: string): Promise<void> {
    try {
      await deletePreset(id);
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Could not delete preset", message: errorMessage(e) });
      return;
    }
    revalidate();
  }

  // Presets are user-typed data with no undo and the seeded flag guarantees a
  // deleted preset never comes back, so this confirms before removing one.
  async function confirmRemovePreset(id: string, text: string): Promise<void> {
    const confirmed = await confirmAlert({
      title: "Delete Preset",
      message: `Delete "${text}"? This cannot be undone.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await removePreset(id);
  }

  const customStatusAction = (
    <Action.Push
      title="Set Custom Status"
      icon={Icon.Pencil}
      shortcut={Keyboard.Shortcut.Common.New}
      target={
        <StatusForm
          submitTitle="Set Status"
          onSubmit={async ({ emoji, text }) => {
            if (await apply(emoji, text)) pop();
          }}
        />
      }
    />
  );

  const createPresetAction = (
    <Action.Push
      title="Create Preset"
      icon={Icon.PlusSquare}
      shortcut={{
        macOS: { modifiers: ["shift", "cmd"], key: "n" },
        Windows: { modifiers: ["shift", "ctrl"], key: "n" },
      }}
      target={
        <StatusForm
          submitTitle="Create Preset"
          onSubmit={async ({ emoji, text }) => {
            try {
              await createPreset({ emoji, text });
            } catch (e) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Could not create preset",
                message: errorMessage(e),
              });
              return;
            }
            revalidate();
            pop();
          }}
        />
      }
    />
  );

  const status = data?.status ?? null;
  const statusError = data?.statusError ?? null;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search statuses"
      // Every other action lives in a row's panel, and Raycast's native
      // filtering is on here (no onSearchTextChange), so a query matching
      // neither the Current Status row nor any preset title hides every row and
      // falls back to Raycast's own empty view, which carries no actions. The
      // two actions that do not need a row to act on are repeated here, on the
      // List itself, so they stay reachable without clearing the search first.
      actions={
        <ActionPanel>
          {customStatusAction}
          {createPresetAction}
        </ActionPanel>
      }
    >
      <List.Section title="Current Status">
        <List.Item
          key="current-status"
          title={statusError ? "Could not load status" : status ? status.text || "Status set" : "No status"}
          subtitle={statusError ?? undefined}
          icon={statusError ? Icon.Warning : status?.emoji || undefined}
          actions={
            <ActionPanel>
              {customStatusAction}
              {status && (
                <Action
                  title="Clear Status"
                  icon={Icon.XMarkCircle}
                  shortcut={{ macOS: { modifiers: ["ctrl"], key: "x" }, Windows: { modifiers: ["ctrl"], key: "x" } }}
                  style={Action.Style.Destructive}
                  onAction={clear}
                />
              )}
              {createPresetAction}
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Presets">
        {(data?.presets ?? []).map((preset: StatusPreset) => (
          <List.Item
            key={preset.id}
            title={preset.text}
            icon={preset.emoji || undefined}
            actions={
              <ActionPanel>
                <Action title="Set This Status" icon={Icon.Check} onAction={() => apply(preset.emoji, preset.text)} />
                <Action.Push
                  title="Edit Preset"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={
                    <StatusForm
                      submitTitle="Save Preset"
                      initialEmoji={preset.emoji}
                      initialText={preset.text}
                      onSubmit={async ({ emoji, text }) => {
                        try {
                          await updatePreset(preset.id, { emoji, text });
                        } catch (e) {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Could not save preset",
                            message: errorMessage(e),
                          });
                          return;
                        }
                        revalidate();
                        pop();
                      }}
                    />
                  }
                />
                <Action
                  title="Delete Preset"
                  icon={Icon.Trash}
                  shortcut={{ macOS: { modifiers: ["ctrl"], key: "x" }, Windows: { modifiers: ["ctrl"], key: "x" } }}
                  style={Action.Style.Destructive}
                  onAction={() => confirmRemovePreset(preset.id, preset.text)}
                />
                {createPresetAction}
                {customStatusAction}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
