import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { runDiagnostics } from "./api/diagnostics";
import { describeFailure } from "./api/failures";
import { Instance } from "./api/types";
import { InstanceForm } from "./instances/InstanceForm";
import { resolveSelected } from "./instances/records";
import { deleteInstance, getSelectedInstanceId, listInstances, setSelectedInstanceId } from "./instances/storage";
import { PlatformShortcut } from "./shortcuts";

/** The manifest claims both platforms, so anything without a Common equivalent is spelled out. */
const SHORTCUTS = {
  use: { macOS: { modifiers: ["cmd"], key: "u" }, Windows: { modifiers: ["ctrl"], key: "u" } },
  diagnostics: {
    macOS: { modifiers: ["cmd", "shift"], key: "d" },
    Windows: { modifiers: ["ctrl", "shift"], key: "d" },
  },
} satisfies Record<string, PlatformShortcut>;

export default function ManageInstancesCommand() {
  const { data, isLoading, revalidate } = usePromise(async () => {
    const [instances, selectedId] = await Promise.all([listInstances(), getSelectedInstanceId()]);
    return { instances, active: resolveSelected(instances, selectedId) };
  });

  const instances = data?.instances ?? [];
  const activeId = data?.active?.id;

  async function handleDelete(instance: Instance) {
    const confirmed = await confirmAlert({
      title: `Remove ${instance.label}?`,
      message: "The stored token is deleted from Raycast. Nothing changes in Targetprocess.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await deleteInstance(instance.id);
    await showToast({ style: Toast.Style.Success, title: "Instance Removed" });
    revalidate();
  }

  async function handleDiagnostics(instance: Instance) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Running Diagnostics…" });
    try {
      await Clipboard.copy(await runDiagnostics(instance));
      toast.style = Toast.Style.Success;
      toast.title = "Diagnostics Copied";
      toast.message = "Structural detail only — no token, no item contents.";
    } catch (error) {
      const { title, message } = describeFailure(error, instance.label);
      toast.style = Toast.Style.Failure;
      toast.title = title;
      toast.message = message;
    }
  }

  async function handleActivate(instance: Instance) {
    await setSelectedInstanceId(instance.id);
    await showToast({ style: Toast.Style.Success, title: `Using ${instance.label}` });
    revalidate();
  }

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        icon={Icon.Plus}
        title="No Instances Yet"
        description="Add your Targetprocess instance to get started. You will need a personal access token from your profile settings."
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Your First Instance"
              icon={Icon.Plus}
              target={<InstanceForm onSaved={revalidate} />}
            />
          </ActionPanel>
        }
      />

      {instances.map((instance) => (
        <List.Item
          key={instance.id}
          icon={statusIcon(instance)}
          title={instance.label}
          subtitle={new URL(instance.baseUrl).host}
          accessories={accessoriesFor(instance, instance.id === activeId)}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title="Edit Instance"
                  icon={Icon.Pencil}
                  target={<InstanceForm instance={instance} onSaved={revalidate} />}
                />
                <Action
                  title="Use This Instance"
                  icon={Icon.Check}
                  onAction={() => handleActivate(instance)}
                  shortcut={SHORTCUTS.use}
                />
                <Action.Push
                  title="Add Instance"
                  icon={Icon.Plus}
                  target={<InstanceForm onSaved={revalidate} />}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action.OpenInBrowser title="Open in Browser" url={instance.baseUrl} />
                <Action
                  title="Copy Diagnostics"
                  icon={Icon.Bug}
                  onAction={() => handleDiagnostics(instance)}
                  shortcut={SHORTCUTS.diagnostics}
                />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action
                  title="Remove Instance"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(instance)}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function statusIcon(instance: Instance) {
  if (instance.lastError) return { source: Icon.ExclamationMark, tintColor: Color.Red };
  if (instance.userId === undefined) return { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
  return { source: Icon.Globe, tintColor: Color.Blue };
}

function accessoriesFor(instance: Instance, isActive: boolean): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (isActive) accessories.push({ tag: { value: "Active", color: Color.Green } });
  if (instance.apiV2Available) accessories.push({ tag: "API v2" });
  if (instance.userName) accessories.push({ text: instance.userName, icon: Icon.Person });
  if (instance.lastError) accessories.push({ icon: { source: Icon.Warning, tintColor: Color.Red } });

  return accessories;
}
