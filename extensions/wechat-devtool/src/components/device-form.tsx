import React, { useState, useEffect } from "react";
import { Form, ActionPanel, Action, Icon, useNavigation, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import {
  saveOrUpdateDevice,
  deleteDevice,
  getCurrentDeviceName,
  getAllDeviceConfigs,
  generateUUID,
} from "../utils/config";
import { DeviceConfig, Project, WechatProjectConfig } from "../types";
import * as fs from "fs";
import * as path from "path";

interface DeviceFormProps {
  initialData?: Partial<DeviceConfig> & { id?: string };
  onSuccess?: () => void;
}

interface FormErrors {
  deviceName?: string;
  cliPath?: string;
  projects?: { name?: string; path?: string }[];
}

const PROJECT_CONFIG_JSON = "project.config.json";
const PROJECT_PRIVATE_CONFIG_JSON = "project.private.config.json";

function isValidWechatMiniprogramDir(path: string): boolean {
  try {
    const projectConfigPath = `${path}/${PROJECT_CONFIG_JSON}`;
    const projectPrivateConfigPath = `${path}/${PROJECT_PRIVATE_CONFIG_JSON}`;
    return fs.existsSync(projectConfigPath) || fs.existsSync(projectPrivateConfigPath);
  } catch {
    return false;
  }
}

function getProjectName(projectPath: string): string | null {
  try {
    const privateConfigPath = path.join(projectPath, PROJECT_PRIVATE_CONFIG_JSON);
    if (fs.existsSync(privateConfigPath)) {
      const privateConfig: WechatProjectConfig = JSON.parse(fs.readFileSync(privateConfigPath, "utf8"));
      if (privateConfig.projectname) {
        return decodeURIComponent(privateConfig.projectname);
      }
    }

    const configPath = path.join(projectPath, PROJECT_CONFIG_JSON);
    if (fs.existsSync(configPath)) {
      const config: WechatProjectConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (config.projectname) {
        return decodeURIComponent(config.projectname);
      }
    }

    return null;
  } catch {
    return null;
  }
}

export default function DeviceForm({ initialData, onSuccess }: DeviceFormProps) {
  const { pop } = useNavigation();
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
    setCliPath(files[0] || "");
    clearError("cliPath");
  }

  function handleProjectNameChange(index: number, value: string) {
    updateProject(index, { ...projects[index], name: value });
    clearError(`project_${index}_name`);
  }

  function handleProjectPathChange(index: number, files: string[]) {
    const selectedPath = files[0] || "";
    const project = projects[index];
    updateProject(index, { ...project, path: selectedPath });
    clearError(`project_${index}_path`);

    if (selectedPath) {
      if (!isValidWechatMiniprogramDir(selectedPath)) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid WeChat Mini Program Project",
          message: "Keeping original path",
        });
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
          const projectName = getProjectName(selectedPath);
          if (projectName) {
            updateProject(index, { ...project, path: selectedPath, name: projectName });
          }
        }
      }
    }
  }

  function validate(): boolean {
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
      await showToast({
        style: Toast.Style.Failure,
        title: "Please complete all required fields",
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
      await showToast({
        style: Toast.Style.Failure,
        title: "Save Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
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
        deleteDevice(initialData.id);
        await showToast({
          style: Toast.Style.Success,
          title: "Configuration Deleted",
        });
        onSuccess?.();
        pop();
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Delete Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
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
      showToast({
        style: Toast.Style.Failure,
        title: "At least one project must be kept",
      });
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
          <Action
            title="Add Project"
            icon={Icon.Plus}
            onAction={() => addProject()}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action title="Cancel" icon={Icon.Xmark} onAction={pop} />
          {isEdit && (
            <Action
              title="Delete Configuration"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleDelete}
            />
          )}
          {projects.map((project, index) => (
            <Action
              key={`remove_${project.id}`}
              title={project.name.trim() ? `Remove ${project.name.trim()}` : `Remove Project ${index + 1}`}
              icon={Icon.Minus}
              style={Action.Style.Destructive}
              onAction={() => removeProject(index)}
            />
          ))}
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
        info="Should match 'System Settings - General - About This Mac - Name', can be obtained via 'scutil --get ComputerName' command"
      />
      <Form.FilePicker
        id="cliPath"
        title="WeChat DevTool CLI Path"
        value={cliPath ? [cliPath] : []}
        onChange={handleCliPathChange}
        canChooseFiles
        canChooseDirectories={false}
        allowMultipleSelection={false}
        info="WeChat DevTool built-in CLI executable, typically located at /Applications/wechatwebdevtools.app/Contents/MacOS/cli"
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
              info="WeChat Mini Program project root directory (contains project.config.json file)"
              error={errorVisible ? projectError.path : undefined}
            />
            {!isLastProject && <Form.Separator />}
          </React.Fragment>
        );
      })}
    </Form>
  );
}
