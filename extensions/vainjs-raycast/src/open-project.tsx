import { getPreferenceValues, ActionPanel, Application, showToast, Action, Toast, Color, List } from "@raycast/api";
import { useEffect, useMemo, useState, useCallback } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);
const GIT_BRANCH_MAX_LENGTH = 20;

type Preferences = {
  hideHiddenDirectories: boolean;
  secondaryEditor?: Application;
  secondaryWorkspace?: string;
  defaultEditor: Application;
  excludePatterns: string;
  workspace: string;
};

type ProjectItem = {
  gitBranch?: string;
  path: string;
  name: string;
  id: string;
};

export default function Command() {
  const {
    excludePatterns: excludePatternsStr,
    hideHiddenDirectories,
    secondaryWorkspace,
    secondaryEditor,
    defaultEditor,
    workspace,
  } = getPreferenceValues<Preferences>();

  const [selectedEditor, setSelectedEditor] = useState<Application>();
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);

  const excludePatterns = useMemo(
    () => (excludePatternsStr ? excludePatternsStr.split(",").map((pattern) => pattern.trim()) : []),
    [excludePatternsStr],
  );

  const editorList = useMemo(
    () => [defaultEditor, secondaryEditor].filter((editor) => !!editor),
    [defaultEditor, secondaryEditor],
  );

  useEffect(() => {
    if (editorList.length > 0) {
      setSelectedEditor(editorList[0]);
    }
  }, [editorList]);

  const shouldExclude = useMemo(
    () =>
      (filePath: string): boolean => {
        const fileName = path.basename(filePath);
        if (hideHiddenDirectories && fileName.startsWith(".")) return true;
        return excludePatterns.some((pattern) => {
          if (!pattern.includes("*")) {
            return fileName === pattern;
          }
          const regexPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
          const regex = new RegExp(`^${regexPattern}$`);
          return regex.test(fileName);
        });
      },
    [excludePatterns, hideHiddenDirectories],
  );

  const loadProjectsFromPath = useCallback(
    async (basePath: string) => {
      const entries = await fs.promises.readdir(basePath, { withFileTypes: true });
      return Promise.all(
        entries
          .filter((entry) => entry.isDirectory() && !shouldExclude(path.join(basePath, entry.name)))
          .map(async (entry) => {
            const fullPath = path.join(basePath, entry.name);
            const item: ProjectItem = {
              id: fullPath,
              path: fullPath,
              name: entry.name,
            };

            try {
              const { stdout } = await execAsync("git branch --show-current", { cwd: fullPath });
              item.gitBranch = stdout.trim();
            } catch {
              // Not a git repository - ignore
            }

            return item;
          }),
      );
    },
    [shouldExclude],
  );

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const primaryProjects = await loadProjectsFromPath(workspace);
      const secondaryProjects = secondaryWorkspace ? await loadProjectsFromPath(secondaryWorkspace) : [];

      setItems([...primaryProjects, ...secondaryProjects].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [workspace, secondaryWorkspace]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const getItemAccessories = useCallback(
    (gitBranch?: string) =>
      gitBranch
        ? [
            {
              tooltip: `Current branch: ${gitBranch}`,
              tag: {
                value:
                  gitBranch.length > GIT_BRANCH_MAX_LENGTH
                    ? `${gitBranch.substring(0, GIT_BRANCH_MAX_LENGTH)}...`
                    : gitBranch,
                color: Color.Green,
              },
            },
          ]
        : [],
    [],
  );

  const onEditorChange = useCallback(
    (path: string) => {
      const newEditor = editorList.find((editor) => editor.path === path);
      if (newEditor) {
        setSelectedEditor(newEditor);
      }
    },
    [editorList],
  );

  const filteredItems = useMemo(
    () => (!searchText ? items : items.filter((item) => item.name.toLowerCase().includes(searchText.toLowerCase()))),
    [items, searchText],
  );

  return (
    <List
      searchBarPlaceholder="Search projects..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
      isLoading={loading}
      searchBarAccessory={
        editorList.length > 1 ? (
          <List.Dropdown storeValue tooltip="Select Editor" onChange={onEditorChange}>
            {editorList.map((editor) => (
              <List.Dropdown.Item key={editor.path} title={editor.name} value={editor.path} />
            ))}
          </List.Dropdown>
        ) : null
      }
    >
      {filteredItems.map((item) => (
        <List.Item
          accessories={getItemAccessories(item.gitBranch)}
          icon={{ fileIcon: item.path }}
          subtitle={item.path}
          title={item.name}
          key={item.id}
          actions={
            <ActionPanel>
              <Action.Open
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                title={`Open in ${selectedEditor?.name}`}
                application={selectedEditor}
                target={item.path}
              />
              <Action.ShowInFinder path={item.path} />
              <Action.CopyToClipboard content={item.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
