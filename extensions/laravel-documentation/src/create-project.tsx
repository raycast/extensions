import { ActionPanel, Action, Form, showToast, Toast, open, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Preferences {
  projectDirectory?: string;
}

interface ProjectOption {
  title: string;
  value: string;
  description: string;
}

const STARTER_KITS: ProjectOption[] = [
  { title: "None (Bare Laravel)", value: "none", description: "Fresh Laravel installation without any starter kit" },
  { title: "Laravel Breeze", value: "breeze", description: "Minimal auth scaffolding with Blade, Vue, or React" },
  { title: "Laravel Jetstream", value: "jetstream", description: "Full-featured auth with teams, 2FA, and more" },
];

const DATABASES: ProjectOption[] = [
  { title: "SQLite", value: "sqlite", description: "Simple file-based database" },
  { title: "MySQL", value: "mysql", description: "Popular relational database" },
  { title: "PostgreSQL", value: "pgsql", description: "Advanced open-source database" },
  { title: "SQL Server", value: "sqlsrv", description: "Microsoft SQL Server" },
];

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: {
    projectName: string;
    directory: string;
    starterKit: string;
    database: string;
    git: boolean;
  }) {
    if (!values.projectName) {
      showToast({ style: Toast.Style.Failure, title: "Project name is required" });
      return;
    }

    setIsLoading(true);

    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating Laravel project...",
        message: values.projectName,
      });

      // Build the command
      let command = `cd "${values.directory}" && laravel new ${values.projectName}`;

      if (values.database && values.database !== "sqlite") {
        command += ` --database=${values.database}`;
      }

      if (!values.git) {
        command += " --no-git";
      }

      if (values.starterKit === "breeze") {
        command += " --breeze";
      } else if (values.starterKit === "jetstream") {
        command += " --jet";
      }

      // Execute the command
      await execAsync(command);

      toast.style = Toast.Style.Success;
      toast.title = "Project created successfully!";
      toast.message = `${values.projectName} is ready`;

      // Open the project folder
      await open(`${values.directory}/${values.projectName}`);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create project",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="projectName"
        title="Project Name"
        placeholder="my-laravel-app"
        info="The name of your new Laravel project (will be the folder name)"
      />

      <Form.TextField
        id="directory"
        title="Parent Directory"
        defaultValue={preferences.projectDirectory || "~/Projects"}
        placeholder="~/Projects"
        info="The directory where the project folder will be created"
      />

      <Form.Separator />

      <Form.Dropdown id="starterKit" title="Starter Kit" defaultValue="none">
        {STARTER_KITS.map((kit) => (
          <Form.Dropdown.Item key={kit.value} value={kit.value} title={kit.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="database" title="Database" defaultValue="sqlite">
        {DATABASES.map((db) => (
          <Form.Dropdown.Item key={db.value} value={db.value} title={db.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Checkbox id="git" title="Git" label="Initialize Git repository" defaultValue={true} />

      <Form.Description
        title="Requirements"
        text="Make sure you have the Laravel installer (`laravel new`) or Composer installed. Run `composer global require laravel/installer` if needed."
      />
    </Form>
  );
}
