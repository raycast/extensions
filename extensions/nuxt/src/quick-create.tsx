import { Action, ActionPanel, Form, showToast, Toast, popToRoot, open, LaunchProps } from "@raycast/api";
import { useState } from "react";
import {
  generateComponent,
  generatePage,
  generateApiRoute,
  generateLayout,
  generateComposable,
} from "./nuxt-dev-server/utils/templates";

type FileType = "component" | "page" | "api" | "layout" | "composable";

interface FormValues {
  name: string;
  type: FileType;
  projectPath: string[];
}

interface LaunchContext {
  type?: FileType;
  projectPath?: string;
}

export default function QuickCreateCommand(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const context = props.launchContext;
  const [nameError, setNameError] = useState<string | undefined>();

  const defaultProjectPath = context?.projectPath ? [context.projectPath] : undefined;

  async function handleSubmit(values: FormValues) {
    if (!values.name || values.name.trim() === "") {
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

      switch (values.type) {
        case "component":
          filePath = generateComponent(projectPath, values.name);
          break;
        case "page":
          filePath = generatePage(projectPath, values.name);
          break;
        case "api":
          filePath = generateApiRoute(projectPath, values.name);
          break;
        case "layout":
          filePath = generateLayout(projectPath, values.name);
          break;
        case "composable":
          filePath = generateComposable(projectPath, values.name);
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
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to create ${values.type}`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create File" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="File Type" defaultValue={context?.type || "component"}>
        <Form.Dropdown.Item value="component" title="Component" icon="🧩" />
        <Form.Dropdown.Item value="page" title="Page" icon="📄" />
        <Form.Dropdown.Item value="api" title="API Route" icon="🔌" />
        <Form.Dropdown.Item value="layout" title="Layout" icon="🎨" />
        <Form.Dropdown.Item value="composable" title="Composable" icon="🔧" />
      </Form.Dropdown>

      <Form.TextField
        id="name"
        title="Name"
        placeholder="Enter file name (e.g., MyComponent, my-page, users)"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />

      <Form.FilePicker
        id="projectPath"
        title="Project Directory"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        defaultValue={defaultProjectPath}
      />

      <Form.Description text="Creates a new Nuxt file with a template in your project." />
    </Form>
  );
}
