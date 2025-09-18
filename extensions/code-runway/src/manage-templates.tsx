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
import { WarpTemplate, TerminalCommand } from "./types";
import { ProjectTemplateStorage } from "./utils/storage";

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

  function getTemplateIcon(template: WarpTemplate): Icon {
    if (template.isDefault) return Icon.Star;

    const name = template.name.toLowerCase();
    if (name.includes("frontend") || name.includes("react") || name.includes("vue")) return Icon.Globe;
    if (name.includes("backend") || name.includes("api") || name.includes("server")) return Icon.Network;
    if (name.includes("fullstack")) return Icon.AppWindowSidebarLeft;
    if (name.includes("microservice")) return Icon.AppWindowGrid3x3;
    if (name.includes("database") || name.includes("db")) return Icon.HardDrive;
    if (name.includes("mobile") || name.includes("app")) return Icon.Mobile;
    if (name.includes("desktop") || name.includes("electron")) return Icon.Desktop;
    if (name.includes("test")) return Icon.CheckCircle;
    if (name.includes("deploy") || name.includes("docker")) return Icon.Rocket;

    return Icon.Terminal;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Manage Warp Launch Configurations"
      actions={
        <ActionPanel>
          <Action.Push
            title="Create New Template"
            target={<EditTemplateForm onSaved={revalidate} />}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      {templates.map((template) => (
        <List.Item
          key={template.id}
          title={template.name}
          subtitle={template.description}
          icon={{ source: getTemplateIcon(template), tintColor: template.isDefault ? Color.Yellow : undefined }}
          accessories={[
            ...(template.isDefault ? [{ text: "Default", icon: Icon.Star, tooltip: "Default Template" }] : []),
            {
              text: `${template.commands.length} commands`,
              icon: Icon.Terminal,
            },
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
  const [splitDirection, setSplitDirection] = useState<"horizontal" | "vertical">(
    template?.splitDirection ?? "vertical",
  );
  const [launchMode, setLaunchMode] = useState<"split-panes" | "multi-tab" | "multi-window">(
    template?.launchMode ?? "split-panes",
  );
  const [isDefault, setIsDefault] = useState(template?.isDefault || false);
  const [commands, setCommands] = useState<TerminalCommand[]>(
    template?.commands || [{ id: "1", title: "", command: "", workingDirectory: "" }],
  );

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

    const validCommands = commands.filter((cmd) => cmd.title.trim() && cmd.command.trim());

    const DEBUG = environment.isDevelopment;
    if (DEBUG) {
      console.log("Valid commands count:", validCommands.length);
    }

    if (validCommands.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "At least one valid command is required",
        message: `Total ${commands.length} commands, ${validCommands.length} are valid.`,
      });
      return;
    }

    try {
      const newTemplate: WarpTemplate = {
        id: template?.id || Date.now().toString(),
        name: name.trim(),
        description: description.trim(),
        splitDirection,
        launchMode,
        isDefault,
        commands: validCommands.map((cmd) => ({
          ...cmd,
          title: cmd.title.trim(),
          command: cmd.command.trim(),
          workingDirectory: cmd.workingDirectory?.trim() || undefined,
        })),
      };

      await ProjectTemplateStorage.addTemplate(newTemplate);

      showToast({
        style: Toast.Style.Success,
        title: isEditing ? "Template Updated" : "Template Created",
        message: `Contains ${validCommands.length} commands.`,
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
        placeholder="Suitable for React/Vue frontend projects"
        value={description}
        onChange={setDescription}
      />

      <Form.Separator />

      <Form.Dropdown
        id="splitDirection"
        title="Split Direction"
        value={splitDirection}
        onChange={(value) => setSplitDirection(value as "horizontal" | "vertical")}
      >
        <Form.Dropdown.Item value="vertical" title="Side-by-side" icon={Icon.Sidebar} />
        <Form.Dropdown.Item value="horizontal" title="Top-bottom" icon={Icon.BarChart} />
      </Form.Dropdown>

      <Form.Dropdown
        id="launchMode"
        title="Launch Mode"
        value={launchMode}
        onChange={(value) => setLaunchMode(value as "split-panes" | "multi-tab" | "multi-window")}
      >
        <Form.Dropdown.Item value="split-panes" title="Split Panes" icon={Icon.AppWindowSidebarLeft} />
        <Form.Dropdown.Item value="multi-tab" title="Multiple Tabs" icon={Icon.AppWindowList} />
        <Form.Dropdown.Item value="multi-window" title="Multiple Windows" icon={Icon.Window} />
      </Form.Dropdown>

      <Form.Checkbox
        id="isDefault"
        title="Set as Default"
        label="Set this as the default Warp launch configuration"
        value={isDefault}
        onChange={setIsDefault}
      />

      <Form.Separator />

      <Form.Description text="Configure terminal commands (at least one is required)" />

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
            info="The terminal command to execute"
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
    </Form>
  );
}

interface TemplateDetailsProps {
  template: WarpTemplate;
}

function TemplateDetails({ template }: TemplateDetailsProps) {
  return (
    <List navigationTitle={`Template Details - ${template.name}`}>
      <List.Section title="Basic Information">
        <List.Item title="Name" subtitle={template.name} icon={Icon.Tag} />
        <List.Item title="Description" subtitle={template.description} icon={Icon.Text} />
        <List.Item
          title="Split Direction"
          subtitle={template.splitDirection === "vertical" ? "Side-by-side" : "Top-bottom"}
          icon={template.splitDirection === "vertical" ? Icon.Sidebar : Icon.BarChart}
        />
        <List.Item
          title="Launch Mode"
          subtitle={
            template.launchMode === "split-panes"
              ? "Split Panes"
              : template.launchMode === "multi-tab"
                ? "Multiple Tabs"
                : "Multiple Windows"
          }
          icon={
            template.launchMode === "split-panes"
              ? Icon.AppWindowSidebarLeft
              : template.launchMode === "multi-tab"
                ? Icon.AppWindowList
                : Icon.Window
          }
        />
        {template.isDefault && (
          <List.Item
            title="Default Template"
            subtitle="This is the default Warp launch configuration"
            icon={Icon.Star}
          />
        )}
      </List.Section>

      <List.Section title="Command List">
        {template.commands.map((command) => (
          <List.Item
            key={command.id}
            title={command.title}
            subtitle={command.command}
            icon={Icon.Terminal}
            accessories={[
              {
                text: command.workingDirectory || "Project Root",
                icon: Icon.Folder,
              },
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}
