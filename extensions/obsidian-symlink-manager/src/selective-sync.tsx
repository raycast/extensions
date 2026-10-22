import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { applySelectiveChange, loadSelectiveChanges, type SelectiveChange } from "./lib/selective-sync";
import type { VaultItem } from "./lib/items";

function safeMarkdown(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replace(/[[\]*_#|`]/g, "\\$&")
    .replaceAll("\n", " ");
}

function description(change: SelectiveChange, targetVault: string): string {
  const label = change.kind === "file" ? "File" : change.kind === "array-entry" ? "Enabled entry" : "Setting";
  return [
    `# ${safeMarkdown(change.label)}`,
    `**${label}** in ${safeMarkdown(change.relativePath || "the selected item")}`,
    "## Default Vault",
    `\`${safeMarkdown(change.defaultValue)}\``,
    `## ${safeMarkdown(targetVault)}`,
    `\`${safeMarkdown(change.targetValue)}\``,
    "Choose a direction from Actions. Only this selected setting or file will change. Both copies stay independent.",
  ].join("\n\n");
}

export default function SelectiveSync({
  item,
  onChanged,
}: {
  item: VaultItem;
  onChanged?: () => Promise<void> | void;
}) {
  const { data: changes = [], isLoading, error, revalidate } = usePromise(loadSelectiveChanges, [item]);
  const targetName = item.targetVault.split("/").filter(Boolean).at(-1) ?? "Target Vault";

  async function apply(change: SelectiveChange, from: "default" | "target") {
    const sourceName = from === "default" ? "Default Vault" : targetName;
    const destinationName = from === "default" ? targetName : "Default Vault";
    const sourceValue = from === "default" ? change.defaultValue : change.targetValue;
    const destinationValue = from === "default" ? change.targetValue : change.defaultValue;
    const confirmed = await confirmAlert({
      title: `Use ${sourceName}'s ${change.label}?`,
      message: `${sourceName}: ${sourceValue}\n${destinationName}: ${destinationValue}\n\nApply only this ${change.kind === "file" ? "file" : "setting"} to ${destinationName}. Existing destination files receive a recoverable backup. Both vaults remain independent.`,
      primaryAction: { title: `Use ${sourceName} Value`, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await showToast({ style: Toast.Style.Animated, title: `Syncing ${change.label} to ${destinationName}` });
    let saved = false;
    try {
      const result = await applySelectiveChange(item, change, from);
      saved = true;
      await revalidate();
      await onChanged?.();
      await showToast({
        style: Toast.Style.Success,
        title: `Synced ${change.label}`,
        message:
          result.historyWarning ??
          (result.backup ? `Previous destination saved at ${result.backup}` : "Copied into the destination vault"),
      });
    } catch (failure) {
      await showToast({
        style: Toast.Style.Failure,
        title: saved ? "Saved, but refresh failed" : "Selective sync failed",
        message: String(failure),
      });
      void revalidate();
    }
  }

  return (
    <List
      navigationTitle={`Sync Specific Changes · ${item.name}`}
      searchBarPlaceholder="Search settings and files..."
      isShowingDetail
      isLoading={isLoading}
    >
      {error ? (
        <List.EmptyView title="Comparison unavailable" description={String(error)} icon={Icon.ExclamationMark} />
      ) : changes.length === 0 ? (
        <List.EmptyView
          title="No selectable changes"
          description="The independent copies currently match."
          icon={Icon.CheckCircle}
        />
      ) : (
        <List.Section title={`${changes.length} Selectable Changes`}>
          {changes.map((change) => (
            <List.Item
              key={change.id}
              title={change.label}
              subtitle={change.relativePath || item.name}
              icon={change.kind === "file" ? Icon.Document : Icon.Gear}
              accessories={[{ tag: { value: change.kind === "file" ? "File" : "Setting", color: Color.Orange } }]}
              detail={<List.Item.Detail markdown={description(change, targetName)} />}
              actions={
                <ActionPanel>
                  {(change.kind !== "file" || change.defaultHash !== null) && (
                    <Action
                      title="Use Default Value in This Vault"
                      icon={Icon.ArrowRight}
                      onAction={() => void apply(change, "default")}
                    />
                  )}
                  {(change.kind !== "file" || change.targetHash !== null) && (
                    <Action
                      title="Use This Vault Value in Default"
                      icon={Icon.ArrowLeft}
                      onAction={() => void apply(change, "target")}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
