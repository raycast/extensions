import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  popToRoot,
  open,
  LaunchProps,
  getPreferenceValues,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useMemo } from "react";
import {
  generateComponent,
  generatePage,
  generateApiRoute,
  generateLayout,
  generateComposable,
  getAvailableTemplates,
  type FileType,
  type TemplateInfo,
} from "./nuxt-dev-server/utils/templates";

interface Preferences {
  customTemplatesPath?: string;
}

interface FormValues {
  name: string;
  type: FileType;
  template: string;
  projectPath: string[];
}

interface LaunchContext {
  type?: FileType;
  projectPath?: string;
}

export default function QuickCreateCommand(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const context = props.launchContext;
  const [nameError, setNameError] = useState<string | undefined>();
  const [selectedType, setSelectedType] = useState<FileType>(context?.type || "component");
  const [name, setName] = useState<string>("");
  const { customTemplatesPath } = getPreferenceValues<Preferences>();

  const defaultProjectPath = context?.projectPath ? [context.projectPath] : undefined;

  const availableTemplates = useMemo<TemplateInfo[]>(() => {
    return getAvailableTemplates(selectedType, customTemplatesPath);
  }, [selectedType, customTemplatesPath]);

  function handleTemplateChange(templateName: string) {
    const template = availableTemplates.find((t) => t.name === templateName);
    if (template && !template.isDefault) {
      setName(template.label);
      setNameError(undefined);
    }
  }

  async function handleSubmit(values: FormValues) {
    const finalName = values.name || name;

    if (!finalName || finalName.trim() === "") {
      setNameError("Name is required");
      return;
    }

    if (!values.projectPath?.[0] && !context?.projectPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Project directory required",
        message: "Please select a project directory",
      });
      return;
    }

    setNameError(undefined);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Creating ${values.type}...`,
      });

      let filePath: string;
      const projectPath = values.projectPath?.[0] || context?.projectPath || "";
      const templateName = values.template || "default";

      switch (values.type) {
        case "component":
          filePath = generateComponent(projectPath, finalName, customTemplatesPath, templateName);
          break;
        case "page":
          filePath = generatePage(projectPath, finalName, customTemplatesPath, templateName);
          break;
        case "api":
          filePath = generateApiRoute(projectPath, finalName, customTemplatesPath, templateName);
          break;
        case "layout":
          filePath = generateLayout(projectPath, finalName, customTemplatesPath, templateName);
          break;
        case "composable":
          filePath = generateComposable(projectPath, finalName, customTemplatesPath, templateName);
          break;
        default:
          throw new Error("Invalid file type");
      }

      await showToast({
        style: Toast.Style.Success,
        title: `Created ${values.type}`,
        message: filePath,
        primaryAction: {
          title: "Open in Editor",
          onAction: () => open(filePath),
        },
      });

      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: `Failed to create ${values.type}` });
    }
  }

  const hasCustomTemplates = availableTemplates.some((t) => t.isCustom);
  const customTemplateCount = availableTemplates.filter((t) => t.isCustom && !t.isDefault).length;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create File" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="type"
        title="File Type"
        info="Select the type of Nuxt file to create"
        defaultValue={context?.type || "component"}
        onChange={(value) => setSelectedType(value as FileType)}
      >
        <Form.Dropdown.Item value="component" title="Component" icon="🧩" />
        <Form.Dropdown.Item value="page" title="Page" icon="📄" />
        <Form.Dropdown.Item value="api" title="API Route" icon="🔌" />
        <Form.Dropdown.Item value="layout" title="Layout" icon="🎨" />
        <Form.Dropdown.Item value="composable" title="Composable" icon="🔧" />
      </Form.Dropdown>

      <Form.Dropdown
        id="template"
        title="Template"
        info={
          hasCustomTemplates
            ? `${customTemplateCount} custom template${customTemplateCount > 1 ? "s" : ""} available. Selecting a custom template will auto-fill the name.`
            : "Configure a custom templates directory in preferences to add your own templates"
        }
        defaultValue="default"
        onChange={handleTemplateChange}
      >
        {availableTemplates.map((template) => (
          <Form.Dropdown.Item key={template.name} value={template.name} title={template.label} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="name"
        title="Name"
        placeholder="Enter file name (e.g., MyComponent, my-page, users)"
        info="The name will be automatically formatted (PascalCase for components, kebab-case for pages)"
        value={name}
        error={nameError}
        onChange={(value) => {
          setName(value);
          setNameError(undefined);
        }}
      />

      <Form.FilePicker
        id="projectPath"
        title="Project Directory"
        info="Select your Nuxt project root directory"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        defaultValue={defaultProjectPath}
      />

      <Form.Description text="Tip: Custom templates are loaded from your configured templates directory. Add .vue or .ts files to components/, pages/, api/, layouts/, or composables/ folders." />
    </Form>
  );
}
