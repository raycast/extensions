import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  LaunchType,
  launchCommand,
  List,
} from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import { useMemo, useState } from "react";
import { isModelMissing } from "./catalog/build";
import { routeModel } from "./catalog/routing";
import { RUN_COMMAND } from "./commands/headless";
import { promptDeeplink } from "./commands/quicklink";
import { getApiKeys } from "./core/preferences";
import type { PromptDef } from "./core/types";
import { deletePrompt, duplicatePrompt, updatePrompt } from "./prompts/store";
import { guarded as guardedAction } from "./ui/feedback";
import { resolveIcon } from "./ui/icons";
import { PromptForm } from "./ui/prompt-form";
import { SnippetList } from "./ui/snippet-list";
import { StoreRecovery } from "./ui/store-recovery";
import { ExportForm, ImportForm } from "./ui/transfer-forms";
import { useCatalog } from "./ui/use-catalog";
import { usePrompts } from "./ui/use-prompts";

const ALL_TAGS = "__all__";

export default function Command() {
  const { prompts, isLoading, error, issues, reload } = usePrompts();
  const { entries } = useCatalog();
  const [tag, setTag] = useState(ALL_TAGS);
  const keys = useMemo(() => getApiKeys(), []);
  const baseLink = useMemo(() => createDeeplink({ command: RUN_COMMAND }), []);

  const tags = useMemo(() => [...new Set(prompts.flatMap((prompt) => prompt.tags))].sort(), [prompts]);
  const visible = useMemo(
    () =>
      prompts
        .filter((prompt) => tag === ALL_TAGS || prompt.tags.includes(tag))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [prompts, tag],
  );

  function change(action: () => Promise<unknown>) {
    return guardedAction("Action Failed", async () => {
      await action();
      await reload();
    })();
  }

  async function remove(prompt: PromptDef) {
    const confirmed = await confirmAlert({
      title: `Delete "${prompt.name}"?`,
      message: "Quicklinks to this prompt will stop working.",
      primaryAction: { title: "Delete Prompt", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) await change(() => deletePrompt(prompt.id));
  }

  const createAction = (
    <Action.Push
      title="Create Prompt"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<PromptForm knownTags={tags} onSaved={reload} />}
    />
  );
  const dataActions = (
    <ActionPanel.Section title="Data">
      <Action.Push title="Manage Snippets" icon={Icon.Snippets} target={<SnippetList />} />
      <Action.Push title="Import Prompts" icon={Icon.Download} target={<ImportForm onImported={reload} />} />
      <Action.Push title="Export Prompts" icon={Icon.Upload} target={<ExportForm />} />
    </ActionPanel.Section>
  );

  if (error) return <StoreRecovery error={error} onRecovered={reload} />;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search prompts"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Tag" storeValue onChange={setTag}>
          <List.Dropdown.Item title="All Tags" value={ALL_TAGS} />
          {tags.map((name) => (
            <List.Dropdown.Item key={name} title={name} value={name} />
          ))}
        </List.Dropdown>
      }
    >
      {issues.length > 0 && (
        <List.Section title="Attention">
          <List.Item
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            title={issues.length === 1 ? "1 Entry Could Not Be Read" : `${issues.length} Entries Could Not Be Read`}
            subtitle="Kept in storage, hidden from the lists"
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Details"
                  content={issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n")}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {visible.map((prompt) => {
        const accessories: List.Item.Accessory[] = [];
        if (prompt.model && isModelMissing(entries, routeModel(prompt.model, keys))) {
          accessories.push({
            icon: { source: Icon.Warning, tintColor: Color.Orange },
            tooltip: "This model is no longer available",
          });
        }
        if (!prompt.enabled) accessories.push({ tag: { value: "Disabled", color: Color.SecondaryText } });
        accessories.push(...prompt.tags.map((name) => ({ tag: name })));

        return (
          <List.Item
            key={prompt.id}
            icon={resolveIcon(prompt.icon)}
            title={prompt.name}
            keywords={prompt.tags}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Prompt"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<PromptForm prompt={prompt} knownTags={tags} onSaved={reload} />}
                />
                {prompt.enabled && (
                  <Action
                    title="Run Prompt"
                    icon={Icon.Play}
                    onAction={guardedAction("Cannot Run Prompt", () =>
                      launchCommand({
                        name: RUN_COMMAND,
                        type: LaunchType.UserInitiated,
                        context: { promptId: prompt.id },
                      }),
                    )}
                  />
                )}
                <Action.CreateQuicklink
                  title="Create Quicklink"
                  icon={Icon.Link}
                  quicklink={{
                    name: prompt.name,
                    icon: resolveIcon(prompt.icon),
                    // Only the ID goes into the link, so later prompt edits apply without a new quicklink.
                    link: promptDeeplink(baseLink, prompt.id),
                  }}
                />
                {createAction}
                <Action
                  title="Duplicate Prompt"
                  icon={Icon.Duplicate}
                  shortcut={Keyboard.Shortcut.Common.Duplicate}
                  onAction={() => change(() => duplicatePrompt(prompt.id))}
                />
                <Action
                  title={prompt.enabled ? "Disable Prompt" : "Enable Prompt"}
                  icon={prompt.enabled ? Icon.CircleDisabled : Icon.CheckCircle}
                  onAction={() => change(() => updatePrompt(prompt.id, { enabled: !prompt.enabled }))}
                />
                {dataActions}
                <Action
                  title="Delete Prompt"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => remove(prompt)}
                />
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && (
        <List.EmptyView
          title="No Prompts"
          actions={
            <ActionPanel>
              {createAction}
              {dataActions}
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
