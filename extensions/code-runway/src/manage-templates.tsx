import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Form,
  useNavigation,
  showHUD,
  Color,
  environment,
} from "@raycast/api";
import { useState, Fragment } from "react";
import { useCachedPromise } from "@raycast/utils";
import { WarpTemplate, TerminalCommand, TerminalType, LauncherKind, EditorType } from "./types";
import { ProjectTemplateStorage } from "./utils/storage";
import { getAvailableEditors, getEditorDisplayName, getEditorIcon } from "./utils/editorLauncher";
import { getTerminalDisplayName, getTerminalIcon } from "./utils/terminalIcons";

function getTemplateTargetLabel(template: WarpTemplate): string {
  if (template.launcherKind === "editor") return getEditorDisplayName(template.editorType);
  if (template.launcherKind === "script") return "Script";
  return getTerminalDisplayName(template.terminalType);
}

function getTemplateIcon(template: WarpTemplate): string | Icon | { fileIcon: string } {
  if (template.launcherKind === "editor") return getEditorIcon(template.editorType);
  if (template.launcherKind === "terminal") return getTerminalIcon(template.terminalType);

  return Icon.Code;
}

function getTemplateTypeLabel(template: WarpTemplate): string {
  if (template.launcherKind === "editor") return "Editor";
  if (template.launcherKind === "script") return "Script";
  return "Terminal";
}

function getTemplateTitle(template: WarpTemplate): string {
  return `${template.isDefault ? "★ " : ""}${template.name}`;
}

export default function ManageTemplates() {
  const {
    isLoading,
    data: templates = [],
    revalidate,
  } = useCachedPromise(
    async () => {
      return await ProjectTemplateStorage.getTemplates();
    },
    [],
    {
      failureToastOptions: {
        title: "Failed to load templates",
      },
    },
  );
  const orderedTemplates = templates
    .filter((template) => template.isDefault)
    .concat(templates.filter((template) => !template.isDefault));

  async function deleteTemplate(id: string) {
    try {
      await ProjectTemplateStorage.removeTemplate(id);
      revalidate();
      showHUD("Template deleted");
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function setAsDefault(template: WarpTemplate) {
    try {
      const updatedTemplate = { ...template, isDefault: true };
      await ProjectTemplateStorage.addTemplate(updatedTemplate);
      revalidate();
      showHUD(`Set ${template.name} as default template`);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to set default",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function syncRecommendedEditorTemplates() {
    try {
      const result = await ProjectTemplateStorage.syncRecommendedEditorTemplates();
      revalidate();
      if (result.addedCount === 0) {
        showHUD("No new editor templates to add");
        return;
      }

      showHUD(`Added ${result.addedCount} recommended editor templates`);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to sync editor templates",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Manage Launch Templates"
      actions={
        <ActionPanel>
          <Action
            title="Add Recommended Editor Templates"
            onAction={syncRecommendedEditorTemplates}
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          />
          <Action.Push
            title="Create New Template"
            target={<EditTemplateForm onSaved={revalidate} />}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      {orderedTemplates.map((template) => (
        <List.Item
          key={template.id}
          title={getTemplateTitle(template)}
          subtitle={template.description}
          icon={getTemplateIcon(template)}
          accessories={[
            ...(template.isDefault
              ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Default Template" }]
              : []),
            {
              text: getTemplateTargetLabel(template),
              icon: getTemplateIcon(template),
              tooltip: `${getTemplateTypeLabel(template)}: ${getTemplateTargetLabel(template)}`,
            },
            ...(template.launcherKind === "terminal"
              ? [
                  {
                    text: `${template.commands.length} commands`,
                    icon: Icon.Code,
                  },
                ]
              : []),
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title="Edit Template"
                  target={<EditTemplateForm template={template} onSaved={revalidate} />}
                  icon={Icon.Pencil}
                />
                {!template.isDefault && (
                  <Action
                    title="Set as Default"
                    icon={Icon.Star}
                    onAction={() => setAsDefault(template)}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                )}
                <Action.Push
                  title="Create New Template"
                  target={<EditTemplateForm onSaved={revalidate} />}
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action.Push title="View Details" target={<TemplateDetails template={template} />} icon={Icon.Eye} />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action
                  title="Delete Template"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteTemplate(template.id)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}

      {templates.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Rocket}
          title="No Templates Found"
          description="Create a template to quickly launch your project development environment."
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Template"
                target={<EditTemplateForm onSaved={revalidate} />}
                icon={Icon.Plus}
              />
              <Action
                title="Add Recommended Editor Templates"
                onAction={syncRecommendedEditorTemplates}
                icon={Icon.Download}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

interface EditTemplateFormProps {
  template?: WarpTemplate;
  onSaved: () => void;
}

function EditTemplateForm({ template, onSaved }: EditTemplateFormProps) {
  const { pop } = useNavigation();
  const isEditing = !!template;

  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [launcherKind, setLauncherKind] = useState<LauncherKind>(template?.launcherKind ?? "terminal");
  const [terminalType, setTerminalType] = useState<TerminalType>(template?.terminalType ?? "warp");
  const [editorType, setEditorType] = useState<EditorType>(template?.editorType ?? "cursor");
  const [splitDirection, setSplitDirection] = useState<"horizontal" | "vertical">(
    template?.splitDirection ?? "vertical",
  );
  const [launchMode, setLaunchMode] = useState<"split-panes" | "multi-tab" | "multi-window">(
    template?.launchMode ?? "split-panes",
  );
  const [isDefault, setIsDefault] = useState(template?.isDefault || false);
  const [ghosttyAutoRun, setGhosttyAutoRun] = useState(template?.ghosttyAutoRun ?? false);
  const [scriptContent, setScriptContent] = useState(template?.scriptContent ?? "");
  const [commands, setCommands] = useState<TerminalCommand[]>(
    template?.commands.length ? template.commands : [{ id: "1", title: "", command: "", workingDirectory: "" }],
  );

  const isTerminalLauncher = launcherKind === "terminal";
  const isEditorLauncher = launcherKind === "editor";
  const isScriptLauncher = launcherKind === "script";
  const isWarp = terminalType === "warp";
  const isGhostty = terminalType === "ghostty";
  const isCmux = terminalType === "cmux";
  const availableEditors = getAvailableEditors(editorType);
  const launchModeOptions = isCmux
    ? [
        { value: "split-panes", title: "Split Panes", icon: "split-left-right.svg" },
        { value: "multi-tab", title: "Multiple Tabs", icon: "launch-multi-tab.svg" },
        { value: "multi-window", title: "Multiple Workspaces", icon: "launch-multi-window.svg" },
      ]
    : isGhostty
      ? [
          { value: "split-panes", title: "Current Tab", icon: "split-left-right.svg" },
          { value: "multi-tab", title: "New Tab", icon: "launch-multi-tab.svg" },
          { value: "multi-window", title: "New Window", icon: "launch-multi-window.svg" },
        ]
      : [
          { value: "split-panes", title: "Split Panes", icon: "split-left-right.svg" },
          { value: "multi-tab", title: "Multiple Tabs", icon: "launch-multi-tab.svg" },
          { value: "multi-window", title: "Multiple Windows", icon: "launch-multi-window.svg" },
        ];
  const launchModeInfo = isWarp
    ? "Warp supports panes, tabs, and windows natively"
    : isCmux
      ? "cmux uses its CLI to create splits, panes (tabs), and workspaces (windows)"
      : "Ghostty uses native AppleScript to create layouts in the current tab, a new tab, or a new window";

  function addCommand() {
    const newCommand: TerminalCommand = {
      id: Date.now().toString(),
      title: "",
      command: "",
      workingDirectory: "",
    };
    setCommands([...commands, newCommand]);
  }

  function updateCommand(index: number, field: keyof TerminalCommand, value: string) {
    const updated = [...commands];
    updated[index] = { ...updated[index], [field]: value };
    setCommands(updated);
  }

  function removeCommand(index: number) {
    if (commands.length > 1) {
      const updated = commands.filter((_, i) => i !== index);
      setCommands(updated);
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Template name cannot be empty",
      });
      return;
    }

    const isGhosttyTerminal = isTerminalLauncher && terminalType === "ghostty";
    const isCmuxTerminal = isTerminalLauncher && terminalType === "cmux";
    const normalizedCommands = commands.map((cmd) => ({
      ...cmd,
      title: cmd.title.trim(),
      command: cmd.command.trim(),
      workingDirectory: cmd.workingDirectory?.trim() || undefined,
    }));
    const validCommands = normalizedCommands.filter((cmd) => {
      if (isGhosttyTerminal) {
        return true;
      }

      return cmd.title && (isCmuxTerminal || cmd.command);
    });

    if (isGhosttyTerminal && ghosttyAutoRun && !normalizedCommands.some((cmd) => cmd.command)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Add at least one command",
        message: "Ghostty Auto-Run needs at least one command to execute.",
      });
      return;
    }

    if (isTerminalLauncher && validCommands.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "At least one valid command is required",
        message: `Total ${commands.length} commands, ${validCommands.length} are valid.`,
      });
      return;
    }

    if (isScriptLauncher && !scriptContent.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Script content cannot be empty",
      });
      return;
    }

    try {
      const newTemplate: WarpTemplate = {
        id: template?.id || Date.now().toString(),
        name: name.trim(),
        description: description.trim(),
        launcherKind,
        terminalType: isTerminalLauncher ? terminalType : undefined,
        editorType: isEditorLauncher ? editorType : undefined,
        scriptContent: isScriptLauncher ? scriptContent.trim() : undefined,
        splitDirection,
        launchMode,
        ghosttyAutoRun: isGhostty ? ghosttyAutoRun : false,
        isDefault,
        commands: isTerminalLauncher ? validCommands : [],
      };

      if (environment.isDevelopment) {
        console.log("=== Saving Template ===");
        console.log("Template ID:", newTemplate.id);
        console.log("Template Name:", newTemplate.name);
        console.log("Launcher Kind:", newTemplate.launcherKind);
        console.log("Terminal Type:", newTemplate.terminalType);
        console.log("Editor Type:", newTemplate.editorType);
        console.log("Has Script Content:", Boolean(newTemplate.scriptContent));
        console.log("Is Default:", newTemplate.isDefault);
      }

      await ProjectTemplateStorage.addTemplate(newTemplate);

      showToast({
        style: Toast.Style.Success,
        title: isEditing ? "Template Updated" : "Template Created",
        message:
          newTemplate.launcherKind === "terminal"
            ? `Contains ${validCommands.length} commands.`
            : newTemplate.launcherKind === "editor"
              ? `Opens in ${getEditorDisplayName(editorType)}.`
              : "Runs the custom script.",
      });

      onSaved();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      navigationTitle={isEditing ? "Edit Template" : "Create New Template"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Template" onSubmit={handleSubmit} />
          {isTerminalLauncher && (
            <ActionPanel.Section>
              <Action
                title="Add Command"
                icon={Icon.Plus}
                onAction={addCommand}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              {commands.length > 1 && (
                <Action
                  title="Delete Last Command"
                  icon={Icon.Minus}
                  onAction={() => removeCommand(commands.length - 1)}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                />
              )}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Template Name"
        placeholder="Frontend Development"
        value={name}
        onChange={setName}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Suitable for React or Vue frontend projects"
        value={description}
        onChange={setDescription}
      />

      <Form.Separator />

      <Form.Dropdown
        id="launcherKind"
        title="Launcher Type"
        value={launcherKind}
        onChange={(value) => setLauncherKind(value as LauncherKind)}
        info="Choose whether this template opens a terminal layout, an editor, or runs a custom script"
      >
        <Form.Dropdown.Item value="terminal" title="Terminal" icon={Icon.Terminal} />
        <Form.Dropdown.Item value="editor" title="Editor" icon={Icon.CodeBlock} />
        <Form.Dropdown.Item value="script" title="Script" icon={Icon.Code} />
      </Form.Dropdown>

      {isTerminalLauncher && (
        <Form.Dropdown
          id="terminalType"
          title="Terminal"
          value={terminalType}
          onChange={(value) => setTerminalType(value as TerminalType)}
          info="Choose which terminal application this template should use"
        >
          <Form.Dropdown.Item value="warp" title="Warp" icon={getTerminalIcon("warp")} />
          <Form.Dropdown.Item value="ghostty" title="Ghostty" icon={getTerminalIcon("ghostty")} />
          <Form.Dropdown.Item value="iterm" title="iTerm" icon={getTerminalIcon("iterm")} />
          <Form.Dropdown.Item value="cmux" title="cmux" icon={getTerminalIcon("cmux")} />
        </Form.Dropdown>
      )}

      {isEditorLauncher && (
        <Form.Dropdown
          id="editorType"
          title="Editor"
          value={editorType}
          onChange={(value) => setEditorType(value as EditorType)}
          info="Choose which editor should open the project root"
        >
          {availableEditors.map((editor) => (
            <Form.Dropdown.Item
              key={editor.editorType}
              value={editor.editorType}
              title={editor.title}
              icon={getEditorIcon(editor.editorType)}
            />
          ))}
        </Form.Dropdown>
      )}

      {isTerminalLauncher && (isWarp || isGhostty || isCmux) && (
        <>
          <Form.Dropdown
            id="splitDirection"
            title="Split Direction"
            value={splitDirection}
            onChange={(value) => setSplitDirection(value as "horizontal" | "vertical")}
            info={
              isWarp
                ? "Only used by Warp"
                : isCmux
                  ? "cmux creates splits via CLI"
                  : "Ghostty creates splits through native AppleScript"
            }
          >
            <Form.Dropdown.Item value="vertical" title="Left / Right" icon="split-left-right.svg" />
            <Form.Dropdown.Item value="horizontal" title="Top / Bottom" icon="split-top-bottom.svg" />
          </Form.Dropdown>

          <Form.Dropdown
            id="launchMode"
            title="Launch Mode"
            value={launchMode}
            onChange={(value) => setLaunchMode(value as "split-panes" | "multi-tab" | "multi-window")}
            info={launchModeInfo}
          >
            {launchModeOptions.map((option) => (
              <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} icon={option.icon} />
            ))}
          </Form.Dropdown>
        </>
      )}

      {isGhostty && (
        <Form.Description
          title="Ghostty Notes"
          text="Ghostty uses native AppleScript to create windows, tabs, and splits. macOS may ask you to allow Raycast to control Ghostty the first time you run it. Commands do not auto-run unless you enable the option below."
        />
      )}

      {isGhostty && (
        <Form.Checkbox
          id="ghosttyAutoRun"
          title="Auto-Run Commands"
          label="Run commands automatically"
          value={ghosttyAutoRun}
          onChange={setGhosttyAutoRun}
        />
      )}

      {isCmux && (
        <Form.Description
          title="cmux Notes"
          text="cmux uses its CLI to create workspaces, splits, and panes. Commands are sent via 'cmux send' and executed automatically."
        />
      )}

      {isTerminalLauncher && terminalType === "iterm" && (
        <Form.Description
          title="iTerm Notes"
          text="iTerm launches through its URL scheme and can run commands in a target directory. It cannot choose between new windows, tabs, or splits."
        />
      )}

      {isEditorLauncher && (
        <Form.Description
          title="Editor Notes"
          text={
            availableEditors.length > 0
              ? "Editor templates open the project root in the selected editor application. They do not run startup commands."
              : "No supported editors were found in /Applications or ~/Applications."
          }
        />
      )}

      {isScriptLauncher && (
        <Form.Description
          title="Script Notes"
          text="Script templates run a Bash snippet with the project root as the working directory. Use $1 for the project path, or CODE_RUNWAY_PROJECT_PATH and CODE_RUNWAY_PROJECT_NAME environment variables."
        />
      )}

      <Form.Checkbox
        id="isDefault"
        title="Set as Default"
        label={`Use this as the default ${
          isEditorLauncher
            ? getEditorDisplayName(editorType)
            : isScriptLauncher
              ? "script"
              : getTerminalDisplayName(terminalType)
        } launch template`}
        value={isDefault}
        onChange={setIsDefault}
      />

      {isTerminalLauncher && (
        <>
          <Form.Separator />

          <Form.Description
            text={
              isWarp
                ? "Configure terminal commands. At least one command is required."
                : terminalType === "ghostty"
                  ? ghosttyAutoRun
                    ? "Configure commands. Ghostty will create the layout, open the working directory, and auto-run any commands you provide."
                    : "Configure panes, tabs, or windows for Ghostty. Commands are optional unless Auto-Run Commands is enabled."
                  : terminalType === "cmux"
                    ? "Configure commands. cmux will create splits, panes, or workspaces and run the commands automatically."
                    : "Configure terminal commands. iTerm will run them in the selected working directory."
            }
          />

          {commands.map((command, index) => (
            <Fragment key={command.id}>
              <Form.TextField
                id={`title-${index}`}
                title={`Command ${index + 1} - Title`}
                placeholder="Dev Server"
                value={command.title}
                onChange={(value) => updateCommand(index, "title", value)}
                info="The title displayed in the terminal tab"
              />

              <Form.TextField
                id={`command-${index}`}
                title={`Command ${index + 1} - Command`}
                placeholder="npm run dev"
                value={command.command}
                onChange={(value) => updateCommand(index, "command", value)}
                info={
                  isGhostty
                    ? ghosttyAutoRun
                      ? "Required for any pane that should auto-run a command"
                      : "Optional. Leave blank to only open the pane, tab, or window"
                    : "The terminal command to execute"
                }
              />

              <Form.TextField
                id={`workingDirectory-${index}`}
                title={`Command ${index + 1} - Working Directory`}
                placeholder="frontend"
                value={command.workingDirectory || ""}
                onChange={(value) => updateCommand(index, "workingDirectory", value)}
                info="Path relative to the project root. Leave blank to use the project root."
              />

              {index < commands.length - 1 && <Form.Separator />}
            </Fragment>
          ))}

          <Form.Separator />

          <Form.Description text="Tip: The working directory is a path relative to the project root. Leave it blank to use the project root." />
        </>
      )}

      {isScriptLauncher && (
        <>
          <Form.Separator />
          <Form.TextArea
            id="scriptContent"
            title="Script"
            placeholder={'cursor "$1"\nopen -a Terminal "$1"'}
            value={scriptContent}
            onChange={setScriptContent}
            info="Executed by Bash with the project root as cwd. $1 is the project path."
          />
        </>
      )}
    </Form>
  );
}

interface TemplateDetailsProps {
  template: WarpTemplate;
}

function TemplateDetails({ template }: TemplateDetailsProps) {
  const isTerminalLauncher = template.launcherKind === "terminal";
  const isEditorLauncher = template.launcherKind === "editor";
  const isScriptLauncher = template.launcherKind === "script";
  const isWarp = template.terminalType === "warp";
  const isGhostty = template.terminalType === "ghostty";
  const isCmux = template.terminalType === "cmux";
  const showSplitSettings = isTerminalLauncher && (isWarp || isGhostty || isCmux);
  const launchModeLabel = isGhostty
    ? template.launchMode === "split-panes"
      ? "Current Tab"
      : template.launchMode === "multi-tab"
        ? "New Tab"
        : "New Window"
    : template.launchMode === "split-panes"
      ? "Split Panes"
      : template.launchMode === "multi-tab"
        ? "Multiple Tabs"
        : "Multiple Windows";
  const launchModeIcon =
    template.launchMode === "split-panes"
      ? Icon.AppWindowSidebarLeft
      : template.launchMode === "multi-tab"
        ? Icon.AppWindowList
        : Icon.Window;

  return (
    <List navigationTitle={`Template Details - ${getTemplateTitle(template)}`}>
      <List.Section title="Basic Information">
        <List.Item title="Name" subtitle={getTemplateTitle(template)} icon={Icon.Tag} />
        <List.Item title="Description" subtitle={template.description} icon={Icon.Text} />
        <List.Item
          title="Launcher Type"
          subtitle={getTemplateTypeLabel(template)}
          icon={isEditorLauncher ? Icon.CodeBlock : isScriptLauncher ? Icon.Code : Icon.Terminal}
        />
        {!isScriptLauncher && (
          <List.Item
            title={isEditorLauncher ? "Editor" : "Terminal"}
            subtitle={
              isEditorLauncher
                ? getEditorDisplayName(template.editorType)
                : getTerminalDisplayName(template.terminalType)
            }
            icon={isEditorLauncher ? getEditorIcon(template.editorType) : getTerminalIcon(template.terminalType)}
          />
        )}
        {showSplitSettings && (
          <>
            <List.Item
              title="Split Direction"
              subtitle={template.splitDirection === "vertical" ? "Left / Right" : "Top / Bottom"}
              icon={template.splitDirection === "vertical" ? Icon.Sidebar : Icon.BarChart}
            />
            <List.Item title="Launch Mode" subtitle={launchModeLabel} icon={launchModeIcon} />
          </>
        )}
        {template.isDefault && (
          <List.Item
            title="Default Template"
            subtitle={`This is the default ${
              isEditorLauncher
                ? getEditorDisplayName(template.editorType)
                : isScriptLauncher
                  ? "script"
                  : getTerminalDisplayName(template.terminalType)
            } launch template`}
            icon={Icon.Star}
          />
        )}
      </List.Section>

      {isEditorLauncher ? (
        <List.Section title="Launch Behavior">
          <List.Item
            title="Open Project Root"
            subtitle="The selected editor opens the project folder directly."
            icon={Icon.Folder}
          />
        </List.Section>
      ) : isScriptLauncher ? (
        <List.Section title="Script">
          <List.Item
            title="Execution"
            subtitle="Runs with the project root as cwd and passes the project path as $1."
            icon={Icon.Play}
          />
          <List.Item title="Content" subtitle={template.scriptContent || "(empty)"} icon={Icon.Code} />
        </List.Section>
      ) : (
        <List.Section title={isWarp ? "Commands" : "Reference Commands"}>
          {template.commands.map((command, index) => (
            <List.Item
              key={command.id}
              title={command.title}
              subtitle={command.command}
              icon={Icon.Terminal}
              accessories={[
                ...(index === 0 && !isWarp
                  ? [{ text: "Working Directory", icon: Icon.Check, tooltip: "Ghostty opens to this directory" }]
                  : []),
                {
                  text: command.workingDirectory || "Project Root",
                  icon: Icon.Folder,
                },
              ]}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
