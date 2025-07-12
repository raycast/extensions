import path from "path";
import { readFile, access } from "fs/promises";
import React, { useState, useEffect } from "react";
import { Form, ActionPanel, Action, Icon, useNavigation, confirmAlert, Alert, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import ReadmeView from "../readme-view";
import { WECHAT_DEVTOOL_CLI_PATH } from "../constants";
import { DeviceConfig, Project, WechatProjectConfig } from "../types";
import {
  saveOrUpdateDevice,
  deleteDevice,
  getCurrentDeviceName,
  getAllDeviceConfigs,
  generateUUID,
} from "../utils/config";

interface DeviceFormProps {
  initialData?: Partial<DeviceConfig> & { id?: string };
  onSuccess?: () => void;
}

interface FormErrors {
  deviceName?: string;
  cliPath?: string;
  projects?: { name?: string; path?: string }[];
}

async function isValidWechatMiniprogramDir(dirPath: string) {
  const projectConfigPath = path.join(dirPath, "project.config.json");
  const projectPrivateConfigPath = path.join(dirPath, "project.private.config.json");

  try {
    await access(projectConfigPath);
    return true;
  } catch {
    try {
      await access(projectPrivateConfigPath);
      return true;
    } catch {
      return false;
    }
  }
}

async function getProjectName(projectPath: string) {
  const configPath = path.join(projectPath, "project.config.json");
  const privateConfigPath = path.join(projectPath, "project.private.config.json");

  try {
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
  } catch (error) {
    console.error("Failed to read project config:", error);
  }

  return null;
}

export default function DeviceForm({ initialData, onSuccess }: DeviceFormProps) {
  const { pop, push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const [deviceName, setDeviceName] = useState(() => {
    if (initialData?.name !== undefined) {
      return initialData.name;
    }

    if (!initialData?.id) {
      const currentDeviceName = getCurrentDeviceName();
      const allDevices = getAllDeviceConfigs();
      const deviceNames = Object.values(allDevices).map((d) => d.name);

      if (deviceNames.length === 0 || !deviceNames.includes(currentDeviceName)) {
        return currentDeviceName;
      }
    }

    return "";
  });

  const [cliPath, setCliPath] = useState(initialData?.cliPath || "");
  const [projects, setProjects] = useState<Project[]>(initialData?.projects || []);
  const [errors, setErrors] = useState<FormErrors>({});
  const [errorVisible, setErrorVisible] = useState(false);

  const isEdit = !!initialData?.id;

  useEffect(() => {
    if (!isEdit && projects.length === 0) {
      addProject();
    }
  }, []);

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

  function handleDeviceNameChange(value: string) {
    setDeviceName(value);
    clearError("deviceName");
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

  async function handleProjectPathChange(index: number, files: string[]) {
    const selectedPath = files[0] ? path.normalize(files[0]) : "";

    const project = projects[index];
    updateProject(index, { ...project, path: selectedPath });
    clearError(`project_${index}_path`);

    if (selectedPath) {
      if (!(await isValidWechatMiniprogramDir(selectedPath))) {
        const message = "Invalid WeChat Mini Program Project";
        showFailureToast(new Error(message), { title: "Invalid Project" });
        showErrors({
          [`project_${index}_path`]: "Selected path is not a valid WeChat Mini Program project",
        });
        if (!project.path) {
          updateProject(index, { ...project, path: "" });
        } else {
          updateProject(index, { ...project, path: project.path });
        }
        return;
      } else {
        if (!project.name.trim()) {
          const projectName = await getProjectName(selectedPath);
          if (projectName) {
            updateProject(index, { ...project, path: selectedPath, name: projectName });
          }
        }
      }
    }
  }

  function validate() {
    const newErrors: FormErrors = {};
    let hasErrors = false;

    if (!deviceName.trim()) {
      newErrors.deviceName = "Required";
      hasErrors = true;
    }
    if (!cliPath.trim()) {
      newErrors.cliPath = "Required";
      hasErrors = true;
    }

    const projectErrors: { name?: string; path?: string }[] = [];
    projects.forEach((p, i) => {
      const projectError: { name?: string; path?: string } = {};
      if (!p.name.trim()) {
        projectError.name = "Required";
        hasErrors = true;
      }
      if (!p.path.trim()) {
        projectError.path = "Required";
        hasErrors = true;
      }
      if (projectError.name || projectError.path) {
        projectErrors[i] = projectError;
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
      const deviceConfig: DeviceConfig = {
        name: deviceName.trim(),
        cliPath: cliPath.trim(),
        projects: projects.map((p) => ({ ...p, name: p.name.trim(), path: p.path.trim() })),
      };
      const result = await saveOrUpdateDevice(deviceConfig, initialData?.id);
      if (result.success) {
        onSuccess?.();
        pop();
      }
    } catch (error) {
      await showFailureToast(error, { title: "Failed to Save" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!initialData?.id) return;
    setIsLoading(true);
    try {
      const confirmed = await confirmAlert({
        title: "Confirm Delete Configuration",
        message: `Are you sure you want to delete "${deviceName}" and its project configuration? This action cannot be undone.`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
          style: Alert.ActionStyle.Cancel,
        },
      });

      if (confirmed) {
        await deleteDevice(initialData.id);
        await showToast({
          style: Toast.Style.Success,
          title: "Configuration Deleted",
        });
        onSuccess?.();
        pop();
      }
    } catch (error) {
      await showFailureToast(error, { title: "Failed to Delete" });
    } finally {
      setIsLoading(false);
    }
  }

  function addProject() {
    const newProject: Project = {
      id: generateUUID(),
      name: "",
      path: "",
      lastUsedAt: Date.now(),
    };
    setProjects([...projects, newProject]);
  }

  function updateProject(index: number, project: Project) {
    const newProjects = [...projects];
    newProjects[index] = project;
    setProjects(newProjects);
  }

  function removeProject(index: number) {
    if (projects.length <= 1) {
      showFailureToast(new Error("At least one project must be kept"), { title: "Cannot Remove Project" });
      return;
    }
    const newProjects = projects.filter((_, i) => i !== index);
    setProjects(newProjects);
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={isEdit ? "Edit Configuration" : "Add Configuration"}
      actions={
        <ActionPanel>
          <Action title="Save" icon={Icon.Check} onAction={handleSubmit} shortcut={{ modifiers: ["cmd"], key: "s" }} />
          <Action title="Cancel" icon={Icon.Xmark} onAction={pop} />
          <Action
            title="Add Project"
            icon={Icon.Plus}
            onAction={() => addProject()}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action title="About This Extension" icon={Icon.Book} onAction={() => push(<ReadmeView />)} />
          {projects.map((project, index) => (
            <Action
              key={`remove_${project.id}`}
              title={project.name.trim() ? `Remove ${project.name.trim()}` : `Remove Project ${index + 1}`}
              icon={Icon.Minus}
              style={Action.Style.Destructive}
              onAction={() => removeProject(index)}
            />
          ))}
          {isEdit && (
            <Action
              title="Delete Configuration"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleDelete}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="deviceName"
        title="Device Name"
        placeholder="Enter device name"
        value={deviceName}
        onChange={handleDeviceNameChange}
        error={errorVisible ? errors.deviceName : undefined}
        info="Should match your Mac's name in System Settings > General > About > Name. You can also run 'scutil --get ComputerName' to get it."
      />
      <Form.FilePicker
        id="cliPath"
        title="WeChat DevTool CLI Path"
        value={cliPath ? [cliPath] : []}
        onChange={handleCliPathChange}
        canChooseFiles
        canChooseDirectories={false}
        allowMultipleSelection={false}
        info={`WeChat DevTool CLI executable, typically at ${WECHAT_DEVTOOL_CLI_PATH}`}
        error={errorVisible ? errors.cliPath : undefined}
      />
      <Form.Separator />
      <Form.Description text="You can add or remove projects in the Actions panel." />
      <Form.Separator />
      {projects.map((project, index) => {
        const projectError = errors.projects && errors.projects[index] ? errors.projects[index] : {};
        const isLastProject = index === projects.length - 1;

        return (
          <React.Fragment key={project.id}>
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
              info="WeChat Mini Program project directory (contains project.config.json)"
              error={errorVisible ? projectError.path : undefined}
            />
            {!isLastProject && <Form.Separator />}
          </React.Fragment>
        );
      })}
    </Form>
  );
}
