import { ActionPanel, Action, showToast, Toast, Icon, LocalStorage, useNavigation, Form } from "@raycast/api";
import { useState, useEffect } from "react";
import { getProjects, Project } from "./utils/projects";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { openInEditor } from "./utils/editor";

const execAsync = promisify(exec);
const LAST_PROJECT_KEY = "last-active-project-factory";

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { pop } = useNavigation();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (currentProject) {
      scanModels(currentProject.path);
    }
  }, [currentProject]);

  async function loadData() {
    setIsLoading(true);
    const savedProjects = await getProjects();
    setProjects(savedProjects);

    const lastPath = await LocalStorage.getItem<string>(LAST_PROJECT_KEY);
    let selected = savedProjects.length > 0 ? savedProjects[0] : null;

    if (lastPath) {
      const match = savedProjects.find((p) => p.path === lastPath);
      if (match) selected = match;
    }

    setCurrentProject(selected);
    setIsLoading(false);
  }

  async function handleProjectChange(projectId: string) {
    const project = projects.find((p) => p.path === projectId);
    if (project) {
      setCurrentProject(project);
      await LocalStorage.setItem(LAST_PROJECT_KEY, project.path);
    }
  }

  function scanModels(projectPath: string) {
    const modelsPath = path.join(projectPath, "app", "Models");
    if (fs.existsSync(modelsPath)) {
      const files = fs.readdirSync(modelsPath);
      const modelFiles = files.filter((f) => f.endsWith(".php")).map((f) => f.replace(".php", ""));
      setModels(modelFiles);
    } else {
      setModels([]);
    }
  }

  async function handleSubmit(values: { model: string; name: string; open: boolean }) {
    if (!currentProject) return;

    setIsLoading(true);
    try {
      const command = `php artisan make:factory ${values.name} --model=${values.model}`;
      await execAsync(`cd "${currentProject.path}" && ${command}`);

      showToast({ style: Toast.Style.Success, title: "Factory Created", message: values.name });

      if (values.open) {
        // Guess the path
        const factoryPath = path.join(currentProject.path, "database", "factories", values.name + ".php");
        await openInEditor(factoryPath);
      }
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to create factory", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Factory" icon={Icon.Wand} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="project" title="Project" value={currentProject?.path} onChange={handleProjectChange}>
        {projects.map((p) => (
          <Form.Dropdown.Item key={p.path} value={p.path} title={p.name} icon={Icon.Folder} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="model"
        title="Model"
        onChange={() => {
          // We can't easily auto-update the 'name' field based on this selection without controlled state for 'name',
          // but Raycast Form typically handles values via ref or onChange events updating state.
          // For simplicity, we assume user types name or we rely on default naming convention of artisan if argument provided?
          // Actually, `values` in handleSubmit will have the selected model.
          // To auto-fill Name: we need controlled component.
        }}
      >
        {models.map((m) => (
          <Form.Dropdown.Item key={m} value={m} title={m} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="name" title="Factory Name" placeholder="UserFactory" info="Name of the factory class" />

      <Form.Checkbox id="open" title="Options" label="Open in Editor" defaultValue={true} />
    </Form>
  );
}
