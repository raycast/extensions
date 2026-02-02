import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  popToRoot,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useMemo } from "react";
import { basename } from "path";
import { addManualProject, hasManualProject } from "./manual-projects";
import { addSource, loadSources } from "./sources";
import { getAllCollections } from "./collections";
import { findProjects, isProject, expandPath } from "./utils";
import type { ProjectIDE } from "./settings";

const DEPTH_OPTIONS = [
  { title: "1 level", value: "1" },
  { title: "2 levels", value: "2" },
  { title: "3 levels", value: "3" },
  { title: "4 levels", value: "4" },
];

function getAppName(appPath: string): string {
  const name = basename(appPath);
  return name.endsWith(".app") ? name.slice(0, -4) : name;
}

export default function AddProjectsCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const [directory, setDirectory] = useState<string[]>([]);
  const [isSource, setIsSource] = useState(false);
  const [depth, setDepth] = useState("2");
  const [collection, setCollection] = useState<string>("");
  const [ideApp, setIdeApp] = useState<string[]>(
    preferences.ide?.path ? [preferences.ide.path] : [],
  );

  const [directoryError, setDirectoryError] = useState<string | undefined>();

  const manualCollections = useMemo(() => {
    return getAllCollections().filter((c) => c.type === "manual");
  }, []);

  function validateDirectory(path: string): string | undefined {
    if (!path) return "Directory is required";

    const expandedPath = expandPath(path);

    // Check for duplicates
    if (!isSource && hasManualProject(expandedPath)) {
      return "This project has already been added";
    }

    const sources = loadSources();
    if (isSource && sources.some((s) => expandPath(s.path) === expandedPath)) {
      return "This source directory has already been added";
    }

    // Validate based on mode
    if (isSource) {
      const depthNum = parseInt(depth, 10);
      const found = findProjects(expandedPath, depthNum);
      if (found.length === 0) {
        return `No projects found at depth ${depthNum}`;
      }
    } else {
      if (!isProject(expandedPath)) {
        return "No project markers found (.git, package.json, etc.)";
      }
    }

    return undefined;
  }

  async function handleSubmit() {
    const path = directory[0];
    if (!path) {
      setDirectoryError("Directory is required");
      return;
    }

    const error = validateDirectory(path);
    if (error) {
      setDirectoryError(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation failed",
        message: error,
      });
      return;
    }

    const expandedPath = expandPath(path);

    // Build IDE object if provided
    let ide: ProjectIDE | undefined;
    if (ideApp.length > 0 && ideApp[0]) {
      ide = {
        path: ideApp[0],
        name: getAppName(ideApp[0]),
      };
    }

    try {
      if (isSource) {
        const depthNum = parseInt(depth, 10);
        const found = findProjects(expandedPath, depthNum);

        addSource({
          path: expandedPath,
          depth: depthNum,
          defaultCollection: collection || undefined,
          defaultIde: ide,
        });

        await showToast({
          style: Toast.Style.Success,
          title: "Source added",
          message: `Found ${found.length} project${found.length === 1 ? "" : "s"}`,
        });
      } else {
        addManualProject({
          path: expandedPath,
          defaultCollection: collection || undefined,
          defaultIde: ide,
        });

        await showToast({
          style: Toast.Style.Success,
          title: "Project added",
          message: basename(expandedPath),
        });
      }

      popToRoot();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  function handleDirectoryChange(paths: string[]) {
    setDirectory(paths);
    if (paths[0]) {
      setDirectoryError(undefined);
    }
  }

  return (
    <Form
      navigationTitle="Add Projects"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isSource ? "Add Source" : "Add Project"}
            icon={isSource ? Icon.Folder : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="directory"
        title="Directory"
        info="Select a project directory or a folder containing multiple projects"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        value={directory}
        onChange={handleDirectoryChange}
        error={directoryError}
      />

      <Form.Checkbox
        id="isSource"
        label="This is a source folder"
        info="Enable if this folder contains multiple projects to scan"
        value={isSource}
        onChange={setIsSource}
      />

      {isSource && (
        <Form.Dropdown
          id="depth"
          title="Scan Depth"
          info="How deep to scan for projects"
          value={depth}
          onChange={setDepth}
        >
          {DEPTH_OPTIONS.map((opt) => (
            <Form.Dropdown.Item
              key={opt.value}
              value={opt.value}
              title={opt.title}
            />
          ))}
        </Form.Dropdown>
      )}

      <Form.Separator />

      <Form.Dropdown
        id="collection"
        title="Collection"
        info="Automatically assign projects to this collection"
        value={collection}
        onChange={setCollection}
      >
        <Form.Dropdown.Item value="" title="None" icon={Icon.Minus} />
        {manualCollections.map((coll) => (
          <Form.Dropdown.Item
            key={coll.id}
            value={coll.id}
            title={coll.name}
            icon={coll.icon ? Icon[coll.icon as keyof typeof Icon] : Icon.Tag}
          />
        ))}
      </Form.Dropdown>

      <Form.FilePicker
        id="ide"
        title="IDE"
        info="Override the default IDE for projects from this source"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles={true}
        value={ideApp}
        onChange={setIdeApp}
      />
    </Form>
  );
}
