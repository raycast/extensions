import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  type LaunchProps,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import * as fs from "fs";
import * as path from "path";
import { homedir } from "os";
import { openInCursor } from "./utils/cursor";
import { addRecentProject } from "./utils/storage";

interface Preferences {
  baseDirectory: string;
}

interface CommandArguments {
  projectName?: string;
}

export default function Command({
  arguments: args,
}: LaunchProps<{ arguments: CommandArguments }>) {
  const preferences = getPreferenceValues<Preferences>();
  const [projectName, setProjectName] = useState("");
  const [validationError, setValidationError] = useState<string | undefined>();
  const [isAutoCreating, setIsAutoCreating] = useState(false);

  const validateProjectName = (name: string): string | undefined => {
    if (!name || name.trim().length === 0) {
      return "Project name is required";
    }

    // Check for invalid characters in Windows paths
    // eslint-disable-next-line no-control-regex
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(name)) {
      return "Project name contains invalid characters";
    }

    // Check for reserved names
    const reservedNames = [
      "CON",
      "PRN",
      "AUX",
      "NUL",
      "COM1",
      "COM2",
      "COM3",
      "COM4",
      "COM5",
      "COM6",
      "COM7",
      "COM8",
      "COM9",
      "LPT1",
      "LPT2",
      "LPT3",
      "LPT4",
      "LPT5",
      "LPT6",
      "LPT7",
      "LPT8",
      "LPT9",
    ];
    if (reservedNames.includes(name.toUpperCase())) {
      return "Project name is a reserved Windows name";
    }

    return undefined;
  };

  const createProject = async (name: string): Promise<boolean> => {
    const trimmedName = name.trim();
    const error = validateProjectName(trimmedName);

    if (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Project Name",
        message: error,
      });
      return false;
    }

    try {
      // Validate and normalize base directory
      let baseDir = preferences.baseDirectory.trim();
      if (!baseDir) {
        baseDir = "C:\\git";
      }

      // Expand user home directory if ~ is used
      if (baseDir.startsWith("~")) {
        baseDir = path.join(homedir(), baseDir.slice(1));
      }

      // Normalize path separators
      baseDir = path.normalize(baseDir);

      // Check if base directory exists
      if (!fs.existsSync(baseDir)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Base Directory Not Found",
          message: `Directory does not exist: ${baseDir}`,
        });
        return false;
      }

      // Check if base directory is actually a directory
      const baseDirStats = fs.statSync(baseDir);
      if (!baseDirStats.isDirectory()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Base Directory",
          message: `${baseDir} is not a directory`,
        });
        return false;
      }

      // Construct project path
      const projectPath = path.join(baseDir, trimmedName);

      // Check if project already exists
      if (fs.existsSync(projectPath)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Project Already Exists",
          message: `A project named "${trimmedName}" already exists at ${projectPath}`,
        });
        return false;
      }

      // Create project directory
      fs.mkdirSync(projectPath, { recursive: true });

      // Add to recent projects
      await addRecentProject(projectPath);

      // Open in Cursor
      const success = await openInCursor(projectPath);

      if (success) {
        await showToast({
          style: Toast.Style.Success,
          title: "Project Created",
          message: `Created "${trimmedName}" and opening in Cursor`,
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Project Created",
          message: `Created "${trimmedName}" but could not open Cursor`,
        });
      }

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Create Project",
        message: errorMessage,
      });
      return false;
    }
  };

  const handleSubmit = async (values: { projectName: string }) => {
    const name = values.projectName.trim();
    const error = validateProjectName(name);

    if (error) {
      setValidationError(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Project Name",
        message: error,
      });
      return;
    }

    setValidationError(undefined);
    const success = await createProject(name);
    if (success) {
      setProjectName("");
    }
  };

  useEffect(() => {
    const autoCreate = async () => {
      if (args.projectName?.trim()) {
        setIsAutoCreating(true);
        await createProject(args.projectName);
      }
    };
    void autoCreate();
  }, [args.projectName]);

  if (isAutoCreating) {
    return null;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="projectName"
        title="Project Name"
        placeholder="my-awesome-project"
        value={projectName}
        onChange={(value) => {
          setProjectName(value);
          // Clear validation error when user types
          if (validationError) {
            setValidationError(undefined);
          }
        }}
        onBlur={(event) => {
          const value = event.target.value || "";
          if (value.trim()) {
            const error = validateProjectName(value.trim());
            setValidationError(error);
          }
        }}
        autoFocus
        info="Enter a name for your new project. It will be created in the configured base directory."
      />
      {validationError && (
        <Form.Description title="" text={`⚠️ ${validationError}`} />
      )}
      <Form.Separator />
      <Form.Description
        title="Base Directory"
        text={preferences.baseDirectory || "C:\\git"}
      />
      <Form.Description
        title="Full Path"
        text={
          projectName.trim()
            ? path.join(
                preferences.baseDirectory || "C:\\git",
                projectName.trim()
              )
            : "Enter a project name to see the full path"
        }
      />
    </Form>
  );
}
