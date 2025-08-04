import path from "path";
import { readFile, access } from "fs/promises";
import { useState, useEffect, Fragment } from "react";
import { Form, ActionPanel, Action, Icon, useNavigation, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import ReadmeView from "./readme-view";
import { REPOSITORY_TYPE, WECHAT_DEVTOOL_CLI_PATH } from "./constants";
import { getExtensionConfig, updateExtensionConfig, createEmptyProject } from "./utils/config";
import { detectRepositoryType } from "./utils/command";
import { ExtensionConfig, Project, WechatProjectConfig } from "./types";

interface FormErrors {
  cliPath?: string;
  projects?: Array<{
    name?: string;
    path?: string;
  }>;
}

interface ConfigureProjectsProps {
  onConfigChange?: () => void;
}

export default function ConfigureProjects({ onConfigChange }: ConfigureProjectsProps) {
  const { pop, push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [cliPath, setCliPath] = useState(WECHAT_DEVTOOL_CLI_PATH);
  const [projects, setProjects] = useState<Project[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [errorVisible, setErrorVisible] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      setIsLoading(true);
      const config = await getExtensionConfig();
      const hasProjects = config.projects.length > 0;
      if (hasProjects) {
        setCliPath(config.cliPath);
        setProjects(config.projects);
      } else {
        setProjects([createEmptyProject()]);
      }
    } catch (error) {
      console.error("Failed to load config:", error);
      await showFailureToast(error, { title: "Failed to Load", message: "Could not load configuration" });
    } finally {
      setIsLoading(false);
    }
  }

  function showErrors(newErrors: FormErrors) {
    setErrors(newErrors);
    setErrorVisible(true);

    setTimeout(() => {
      setErrorVisible(false);
    }, 3000);
  }

  function clearError(errorKey: string) {
    setErrors((prev) => {
      const newErrors = { ...prev };
      if (errorKey.startsWith("project_")) {
        const [, index, field] = errorKey.split("_");
        const projectIndex = parseInt(index);
        if (newErrors.projects && newErrors.projects[projectIndex]) {
          newErrors.projects[projectIndex] = { ...newErrors.projects[projectIndex], [field]: undefined };
        }
      } else {
        (newErrors as Record<string, string | undefined>)[errorKey] = undefined;
      }
      return newErrors;
    });
  }

  function handleCliPathChange(files: string[]) {
    const normalizedPath = files[0] ? path.normalize(files[0]) : "";
    setCliPath(normalizedPath);
    clearError("cliPath");
  }

  function handleProjectNameChange(index: number, value: string) {
    updateProject(index, { ...projects[index], name: value });
    clearError(`project_${index}_name`);
  }

  function handleProjectValidationError(index: number, project: Project, errorMessage: string) {
    showFailureToast(new Error(errorMessage), { title: "Invalid Project" });
    showErrors({
      [`project_${index}_path`]: "Selected path is not a valid WeChat mini program project",
    });
    if (!project.path) {
      updateProject(index, { ...project, path: "" });
    } else {
      updateProject(index, { ...project, path: project.path });
    }
  }

  async function handleProjectPathChange(index: number, files: string[]) {
    const selectedPath = files[0] ? path.normalize(files[0]) : "";
    const project = projects[index];

    updateProject(index, { ...project, path: selectedPath });
    clearError(`project_${index}_path`);

    if (!selectedPath) return;

    if (!validateProjectPath(selectedPath)) {
      showErrors({
        [`project_${index}_path`]: "Selected path is required",
      });
      if (!project.path) {
        updateProject(index, { ...project, path: "" });
      } else {
        updateProject(index, { ...project, path: project.path });
      }
      return;
    }

    if (!(await validateWechatProject(selectedPath))) {
      handleProjectValidationError(index, project, "Invalid WeChat mini program project");
      return;
    }

    // Auto-fill project name if empty
    if (!project.name.trim()) {
      const projectName = await getProjectName(selectedPath);
      if (projectName) {
        updateProject(index, { ...project, path: selectedPath, name: projectName });
      }
    }
  }

  function validate() {
    const newErrors: FormErrors = {};
    let hasErrors = false;

    if (!cliPath.trim()) {
      newErrors.cliPath = "Required";
      hasErrors = true;
    }

    const projectErrors: { name?: string; path?: string }[] = [];
    projects.forEach((project, index) => {
      const projectError: { name?: string; path?: string } = {};
      if (!project.name.trim()) {
        projectError.name = "Required";
        hasErrors = true;
      }
      if (!project.path.trim()) {
        projectError.path = "Required";
        hasErrors = true;
      }
      if (projectError.name || projectError.path) {
        projectErrors[index] = projectError;
      }
    });

    if (projectErrors.length > 0) {
      newErrors.projects = projectErrors;
    }

    if (hasErrors) {
      showErrors(newErrors);
    }

    return !hasErrors;
  }

  async function handleSubmit() {
    if (!validate()) {
      await showFailureToast(new Error("Please complete all required fields"), {
        title: "Required Fields Missing",
      });
      return;
    }
    setIsLoading(true);
    try {
      const projectsWithRepoType = await Promise.all(
        projects.map(async (project) => {
          const repositoryType = await detectRepositoryType(project.path.trim()).catch(() => REPOSITORY_TYPE.UNKNOWN);
          return { ...project, name: project.name.trim(), path: project.path.trim(), repositoryType };
        }),
      );
      const config: ExtensionConfig = {
        cliPath: cliPath.trim(),
        projects: projectsWithRepoType,
      };
      await updateExtensionConfig(config);
      await showToast({
        style: Toast.Style.Success,
        title: "Configuration Saved",
      });
      onConfigChange?.();
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to Save" });
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    const newProject = createEmptyProject();

    setCliPath(WECHAT_DEVTOOL_CLI_PATH);
    setProjects([newProject]);

    showToast({
      style: Toast.Style.Success,
      title: "Configuration Reset",
      message: "Configuration has been reset to default values.",
    });
  }

  function addProject() {
    const newProject = createEmptyProject();
    setProjects([...projects, newProject]);
  }

  function updateProject(index: number, project: Project) {
    const updatedProjects = [...projects];
    updatedProjects[index] = project;
    setProjects(updatedProjects);
  }

  function removeProject(index: number) {
    const updatedProjects = projects.filter((_, projectIndex) => projectIndex !== index);

    // If removing the last project, add an empty one
    if (updatedProjects.length === 0) {
      setProjects([createEmptyProject()]);
    } else {
      setProjects(updatedProjects);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Configure Projects"
      actions={
        <ActionPanel>
          <Action title="Save" icon={Icon.Check} onAction={handleSubmit} />
          <Action title="Cancel" icon={Icon.Xmark} onAction={pop} />
          <Action
            title="Add Project"
            icon={Icon.Plus}
            onAction={() => addProject()}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action title="About This Extension" icon={Icon.Book} onAction={() => push(<ReadmeView />)} />
          {projects.map((project, index) => {
            // Don't show remove action if there's only one empty project
            const isOnlyEmptyProject = projects.length === 1 && !project.name.trim() && !project.path.trim();
            if (isOnlyEmptyProject) {
              return null;
            }

            return (
              <Action
                key={`remove_${project.id}`}
                title={project.name.trim() ? `Remove ${project.name.trim()}` : `Remove Project ${index + 1}`}
                icon={Icon.Minus}
                style={Action.Style.Destructive}
                onAction={() => removeProject(index)}
              />
            );
          })}
          <Action
            title="Reset Configuration"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={handleReset}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="cliPath"
        title="WeChat DevTool CLI Path"
        value={cliPath ? [cliPath] : []}
        onChange={handleCliPathChange}
        canChooseFiles
        canChooseDirectories={false}
        allowMultipleSelection={false}
        info={`WeChat DevTool CLI executable, typically located at "${WECHAT_DEVTOOL_CLI_PATH}"`}
        error={errorVisible ? errors.cliPath : undefined}
      />
      <Form.Separator />
      <Form.Description text="You can add or remove projects via Actions panel." />
      <Form.Separator />
      {projects.map((project, index) => {
        const projectError = errors.projects && errors.projects[index] ? errors.projects[index] : {};
        const isLastProject = index === projects.length - 1;

        return (
          <Fragment key={project.id}>
            <Form.Description text={`Project ${index + 1}`} />
            <Form.TextField
              id={`project_${index}_name`}
              title="Project Name"
              placeholder="Enter project name"
              value={project.name}
              onChange={(value) => handleProjectNameChange(index, value)}
              error={errorVisible ? projectError.name : undefined}
            />
            <Form.FilePicker
              id={`project_${index}_path`}
              title="Project Path"
              value={project.path ? [project.path] : []}
              onChange={(files) => handleProjectPathChange(index, files)}
              canChooseFiles={false}
              canChooseDirectories
              allowMultipleSelection={false}
              info="WeChat mini program project directory (must contain project.config.json)"
              error={errorVisible ? projectError.path : undefined}
            />
            {!isLastProject && <Form.Separator />}
          </Fragment>
        );
      })}
    </Form>
  );
}

async function isValidWechatMiniprogramDir(dirPath: string) {
  const projectConfigPath = path.resolve(dirPath, "project.config.json");

  try {
    await access(projectConfigPath);
    return true;
  } catch {
    return false;
  }
}

async function getProjectName(projectPath: string) {
  const configPath = path.resolve(projectPath, "project.config.json");
  const privateConfigPath = path.resolve(projectPath, "project.private.config.json");

  try {
    const privateConfigContent = await readFile(privateConfigPath, "utf8");
    const privateConfig: WechatProjectConfig = JSON.parse(privateConfigContent);
    if (privateConfig.projectname) {
      return decodeURIComponent(privateConfig.projectname);
    }
  } catch {
    // Private config doesn't exist or is invalid, try public config
  }

  try {
    const configContent = await readFile(configPath, "utf8");
    const config: WechatProjectConfig = JSON.parse(configContent);
    if (config.projectname) {
      return decodeURIComponent(config.projectname);
    }
  } catch {
    // Config doesn't exist or is invalid
  }

  return null;
}

function validateProjectPath(selectedPath: string) {
  return selectedPath.trim().length > 0;
}

async function validateWechatProject(selectedPath: string) {
  return await isValidWechatMiniprogramDir(selectedPath);
}
