import {
  Action,
  ActionPanel,
  closeMainWindow,
  LaunchProps,
  List,
  open,
  popToRoot,
  showToast,
  Toast,
  Form,
  Icon,
  confirmAlert,
  Alert,
  Clipboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { CustomAction } from "./api/custom-actions/custom-actions.types";
import {
  getCustomAction,
  getCustomActions,
  deleteCustomAction,
  saveCustomAction,
} from "./api/custom-actions/custom-actions.service";
import { useObsidianVaults } from "./utils/hooks";
import { applyTemplates } from "./api/templating/templating.service";
import { Obsidian, ObsidianTargetType } from "@/obsidian";
import { ActionForm } from "./components/ActionForm";

interface ComponentProps {
  action: CustomAction;
}

function ActionInput({ action }: ComponentProps) {
  const { vaults } = useObsidianVaults();
  const [content, setContent] = useState("");

  useEffect(() => {
    async function loadInitial() {
      if (action.type === "template") {
        // If type is template, we pre-fill the content with the resolved template
        // And for the final submit, we just treat content as the text to append.
        const resolved = await applyTemplates("", action.template);
        setContent(resolved);
      }
    }
    loadInitial();
  }, [action]);

  async function handleSubmit() {
    const vault = vaults.find((v) => v.name === action.vaultName) || vaults[0];
    if (!vault) {
      showToast(Toast.Style.Failure, "Vault not found", `Vault '${action.vaultName}' is not available.`);
      return;
    }

    let pathContent = "";
    if (action.path.includes("{content}")) {
      pathContent = content.split("\n")[0];
      pathContent = pathContent
        .replace(/^#+\s+/g, "")
        .replace(/\[\[([^\]]+)\]\]/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*_`]/g, "")
        .trim()
        .substring(0, 100)
        .replace(/\s+/g, "_");
    }

    let expandedPath = action.path.includes("{content}")
      ? await applyTemplates(pathContent, action.path)
      : await applyTemplates("", action.path);
    if (!expandedPath.toLowerCase().endsWith(".md")) {
      expandedPath += ".md";
    }

    let finalContent = "";
    if (action.type === "template") {
      finalContent = await applyTemplates("", content);
    } else {
      // Default "capture" mode: Wrap content in template
      finalContent = await applyTemplates(content, action.template);
    }

    const target = Obsidian.getTarget({
      type: ObsidianTargetType.AppendToNote,
      vault: vault,
      text: finalContent,
      path: expandedPath,
      mode: action.mode,
      heading: action.heading,
      silent: action.silent,
    });

    await open(target);
    await closeMainWindow();
    await popToRoot();
  }

  return (
    <Form
      navigationTitle={"Append to: " + action.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Action" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      {action.description && <Form.Description text={action.description} />}
      <Form.TextArea
        id="content"
        placeholder="Enter text..."
        value={content}
        onChange={setContent}
        enableMarkdown={true}
        autoFocus={true}
      />
      <Form.Description text="Available variables: {clipboard}, {selection}, {date}, {time}, {year}, {month}, {week}..." />
    </Form>
  );
}

export default function RunActionCommand(props: LaunchProps<{ launchContext?: { actionId?: string } }>) {
  const { launchContext } = props;
  const [action, setAction] = useState<CustomAction | null>(null);
  const [actions, setActions] = useState<CustomAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadActions() {
    setIsLoading(true);
    const all = await getCustomActions();
    setActions(all);
    setIsLoading(false);
  }

  useEffect(() => {
    async function init() {
      if (launchContext?.actionId) {
        const a = await getCustomAction(launchContext.actionId);
        setAction(a ?? null);
        setIsLoading(false);
      } else {
        await loadActions();
      }
    }
    init();
  }, []);

  async function handleDelete(action: CustomAction) {
    if (
      await confirmAlert({
        title: "Delete Action",
        message: "Are you sure? This cannot be undone.",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await deleteCustomAction(action.id);
      await loadActions();
      showToast(Toast.Style.Success, "Action deleted");
    }
  }

  async function handleExport() {
    const json = JSON.stringify(actions, null, 2);
    await Clipboard.copy(json);
    showToast(Toast.Style.Success, "Actions Exported", "Required JSON copied to clipboard");
  }

  async function handleImport() {
    const content = await Clipboard.readText();
    if (!content) {
      showToast(Toast.Style.Failure, "Clipboard is empty");
      return;
    }

    try {
      const imported = JSON.parse(content);
      if (!Array.isArray(imported)) throw new Error("Format invalid");

      if (
        await confirmAlert({
          title: "Import Actions",
          message: `Found ${imported.length} actions. This will merge them with your existing ones.`,
          primaryAction: { title: "Import" },
        })
      ) {
        for (const action of imported) {
          // Rudimentary validation
          if (action.id && action.title && action.path) {
            await saveCustomAction(action);
          }
        }
        await loadActions();
        showToast(Toast.Style.Success, "Actions Imported");
      }
    } catch (e) {
      showToast(Toast.Style.Failure, "Invalid JSON", "Clipboard content is not a valid actions export.");
    }
  }

  if (isLoading) return <List isLoading={true} />;

  // Single Action Mode (from Quicklink)
  if (launchContext?.actionId) {
    if (!action) return <List.EmptyView title="Action not found" />;
    return <ActionInput action={action} />;
  }

  // List Mode
  return (
    <List searchBarPlaceholder="Select an action to run...">
      {actions.map((a) => (
        <List.Item
          key={a.id}
          title={a.title}
          subtitle={a.path}
          icon={Icon.TextDocument}
          accessories={[{ text: a.vaultName }]}
          actions={
            <ActionPanel>
              <Action.Push title="Run Action" target={<ActionInput action={a} />} icon={Icon.Play} />
              <Action.CopyToClipboard
                title="Copy Quicklink URL"
                content={`raycast://extensions/marcjulian/obsidian/runActionCommand?launchContext=${encodeURIComponent(
                  JSON.stringify({ actionId: a.id })
                )}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <ActionPanel.Section>
                <Action.Push
                  title="Edit Action"
                  target={<ActionForm action={a} onSave={loadActions} />}
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action
                  title="Delete Action"
                  onAction={() => handleDelete(a)}
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push
                  title="Create New Action"
                  target={<ActionForm onSave={loadActions} />}
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Export All Actions"
                  onAction={handleExport}
                  icon={Icon.Download}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                />
                <Action
                  title="Import Actions"
                  onAction={handleImport}
                  icon={Icon.Upload}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        title="No Actions Found"
        description="Create your first custom action to append/prepend text to specific notes."
        actions={
          <ActionPanel>
            <Action.Push title="Create New Action" target={<ActionForm onSave={loadActions} />} icon={Icon.Plus} />
            <Action
              title="Import Actions"
              onAction={handleImport}
              icon={Icon.Upload}
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
