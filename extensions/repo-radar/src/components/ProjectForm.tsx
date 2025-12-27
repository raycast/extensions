import { ActionPanel, Action, Form, showToast, Toast, useNavigation, launchCommand, LaunchType } from "@raycast/api";
import { useState } from "react";
import { ProjectFormProps, AppInfo, OpenMode } from "../types";
import { addProject, updateProject, isAliasExists } from "../lib/storage";
import { useApplications, useTerminals } from "../hooks/useApplications";
import { createProjectDeeplink } from "../utils/deeplink";
import { DEFAULT_GROUPS, supportsMultiWorkspace, Icons } from "../constants";

// ============================================
// Form Values Interface
// ============================================

interface FormValues {
  alias: string;
  paths: string[];
  appBundleId: string;
  openMode: OpenMode;
  terminalBundleId: string;
  group: string;
  createQuicklink: boolean;
}

// ============================================
// ProjectForm Component
// ============================================

export default function ProjectForm({ project, groups = [], onSave }: ProjectFormProps) {
  const { pop } = useNavigation();
  const [aliasError, setAliasError] = useState<string | undefined>();
  const { applications, isLoading: appsLoading } = useApplications();
  const { terminals, isLoading: terminalsLoading } = useTerminals();

  // Track selected paths and app for multi-workspace warning
  const [selectedPaths, setSelectedPaths] = useState<string[]>(project?.paths || []);
  const [selectedAppBundleId, setSelectedAppBundleId] = useState<string | undefined>(project?.app?.bundleId);
  const [selectedOpenMode, setSelectedOpenMode] = useState<OpenMode>(project?.openMode || "ide");
  const [selectedGroup, setSelectedGroup] = useState<string>(project?.group || "");
  const [customGroup, setCustomGroup] = useState<string>("");

  const isEditing = !!project;
  const isCreatingNewGroup = selectedGroup === "__new__";
  const showTerminalSelector = selectedOpenMode === "terminal" || selectedOpenMode === "both";

  // Check if we need to show multi-workspace warning
  const showMultiWorkspaceWarning =
    selectedPaths.length > 1 && selectedAppBundleId && !supportsMultiWorkspace(selectedAppBundleId);

  const selectedAppName = applications.find((app) => app.bundleId === selectedAppBundleId)?.name;

  // Combine existing groups with default groups
  const allGroups = [...new Set([...groups, ...DEFAULT_GROUPS])];

  async function handleSubmit(values: FormValues) {
    // Validate alias
    if (!values.alias.trim()) {
      setAliasError("Alias is required");
      return;
    }

    // Check for duplicate alias
    const aliasExists = await isAliasExists(values.alias.trim(), project?.id);
    if (aliasExists) {
      setAliasError("This alias already exists");
      return;
    }

    // Validate paths
    if (!values.paths || values.paths.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Please select at least one path",
      });
      return;
    }

    // Validate app selection (only if mode includes IDE)
    const openMode = values.openMode || "ide";
    if ((openMode === "ide" || openMode === "both") && !values.appBundleId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Please select an IDE",
      });
      return;
    }

    // Validate terminal selection (only if mode includes terminal)
    if ((openMode === "terminal" || openMode === "both") && !values.terminalBundleId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Please select a terminal",
      });
      return;
    }

    // Find the selected app
    const selectedApp = applications.find((app) => app.bundleId === values.appBundleId);
    if ((openMode === "ide" || openMode === "both") && !selectedApp) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Selected IDE not found",
      });
      return;
    }

    // Find the selected terminal
    const selectedTerminal = terminals.find((t) => t.bundleId === values.terminalBundleId);
    if ((openMode === "terminal" || openMode === "both") && !selectedTerminal) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Selected terminal not found",
      });
      return;
    }

    try {
      // Build app info (use first app as fallback for terminal-only mode)
      const appInfo: AppInfo = selectedApp
        ? { name: selectedApp.name, bundleId: selectedApp.bundleId, path: selectedApp.path }
        : {
            name: applications[0]?.name || "Unknown",
            bundleId: applications[0]?.bundleId || "",
            path: applications[0]?.path || "",
          };

      // Build terminal info
      const terminalInfo: AppInfo | undefined = selectedTerminal
        ? { name: selectedTerminal.name, bundleId: selectedTerminal.bundleId, path: selectedTerminal.path }
        : undefined;

      // Determine the final group value
      const finalGroup = values.group === "__new__" ? customGroup.trim() || undefined : values.group || undefined;

      if (isEditing && project) {
        await updateProject(project.id, {
          alias: values.alias.trim(),
          paths: values.paths,
          app: appInfo,
          openMode,
          terminal: terminalInfo,
          group: finalGroup,
        });
        await showToast({
          style: Toast.Style.Success,
          title: "Project updated",
          message: values.alias,
        });
        onSave();
        pop();
      } else {
        const newProject = await addProject({
          alias: values.alias.trim(),
          paths: values.paths,
          app: appInfo,
          openMode,
          terminal: terminalInfo,
          group: finalGroup,
        });
        await showToast({
          style: Toast.Style.Success,
          title: "Project added",
          message: values.alias,
        });
        onSave();

        if (values.createQuicklink) {
          const deeplink = createProjectDeeplink(newProject.id);
          await launchCommand({
            ownerOrAuthorName: "raycast",
            extensionName: "raycast",
            name: "create-quicklink",
            type: LaunchType.UserInitiated,
            context: {
              name: newProject.alias,
              link: deeplink,
            },
          });
        } else {
          pop();
        }
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save project",
        message: String(error),
      });
    }
  }

  function handleAliasChange() {
    if (aliasError) {
      setAliasError(undefined);
    }
  }

  return (
    <Form
      isLoading={appsLoading || terminalsLoading}
      navigationTitle={isEditing ? "Edit Project" : "New Project"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Save" : "Create"} icon={Icons.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="alias"
        title="Alias"
        placeholder="my-project"
        info="Short name for quick access"
        defaultValue={project?.alias}
        error={aliasError}
        onChange={handleAliasChange}
        autoFocus
      />

      <Form.FilePicker
        id="paths"
        title="Paths"
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles={false}
        info="Select project folders"
        defaultValue={project?.paths}
        onChange={setSelectedPaths}
      />

      <Form.Dropdown
        id="openMode"
        title="Open Mode"
        info="How to open this project"
        defaultValue={project?.openMode || "ide"}
        onChange={(value) => setSelectedOpenMode(value as OpenMode)}
      >
        <Form.Dropdown.Item value="ide" title="IDE Only" icon={Icons.ArrowSquareOut} />
        <Form.Dropdown.Item value="terminal" title="Terminal Only" icon={Icons.ArrowSquareOut} />
        <Form.Dropdown.Item value="both" title="IDE + Terminal" icon={Icons.ArrowSquareOut} />
      </Form.Dropdown>

      {(selectedOpenMode === "ide" || selectedOpenMode === "both") && (
        <Form.Dropdown
          id="appBundleId"
          title="IDE"
          defaultValue={appsLoading ? undefined : project?.app?.bundleId}
          onChange={setSelectedAppBundleId}
        >
          {applications.map((app) => (
            <Form.Dropdown.Item
              key={app.bundleId}
              value={app.bundleId}
              title={app.name}
              icon={{ fileIcon: app.path }}
            />
          ))}
        </Form.Dropdown>
      )}

      {showMultiWorkspaceWarning && (
        <Form.Description
          title="Note"
          text={`${selectedAppName || "This IDE"} does not support multi-folder workspaces. Each path will open in a separate window.`}
        />
      )}

      {showTerminalSelector && (
        <Form.Dropdown
          id="terminalBundleId"
          title="Terminal"
          defaultValue={terminalsLoading ? undefined : project?.terminal?.bundleId}
        >
          {terminals.map((terminal) => (
            <Form.Dropdown.Item
              key={terminal.bundleId}
              value={terminal.bundleId}
              title={terminal.name}
              icon={{ fileIcon: terminal.path }}
            />
          ))}
        </Form.Dropdown>
      )}

      <Form.Dropdown
        id="group"
        title="Group"
        info="Organize projects by group"
        defaultValue={project?.group || ""}
        onChange={setSelectedGroup}
      >
        <Form.Dropdown.Item key="" value="" title="No Group" icon={Icons.Minus} />
        {allGroups.map((group) => (
          <Form.Dropdown.Item key={group} value={group} title={group} icon={Icons.Folder} />
        ))}
        <Form.Dropdown.Section title="Custom">
          <Form.Dropdown.Item key="__new__" value="__new__" title="Create New Group..." icon={Icons.Plus} />
        </Form.Dropdown.Section>
      </Form.Dropdown>

      {isCreatingNewGroup && (
        <Form.TextField
          id="customGroup"
          title="New Group Name"
          placeholder="Enter group name"
          value={customGroup}
          onChange={setCustomGroup}
        />
      )}

      {!isEditing && (
        <>
          <Form.Separator />
          <Form.Checkbox
            id="createQuicklink"
            label="Create Quicklink"
            info="Access this project from Raycast root search"
            defaultValue={true}
          />
        </>
      )}
    </Form>
  );
}
