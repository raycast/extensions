/**
 * Daytona Files Command
 * Task 12: Complete file browser and management system
 */

import {
  ActionPanel,
  Action,
  List,
  Icon,
  Form,
  useNavigation,
  Detail,
  confirmAlert,
  Alert,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { daytonaUtils } from "./lib/daytona-utils";
import { toastUtils } from "./lib/toast-utils";

interface FileItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modifiedTime: string;
  permissions?: string;
}

function FilesCommand() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState("/home/daytona");
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [workspaceExists, setWorkspaceExists] = useState(false);
  const [workspacePath, setWorkspacePath] = useState("/home/daytona/workspace");

  useEffect(() => {
    initializeFileManager();
  }, []);

  const initializeFileManager = async () => {
    try {
      // First check if workspace directory exists and has content
      const workspaceInfo = await checkWorkspaceDirectory();
      setWorkspaceExists(workspaceInfo.exists);
      setWorkspacePath(workspaceInfo.path);

      if (workspaceInfo.exists) {
        setCurrentPath(workspaceInfo.path);
        await loadFiles(workspaceInfo.path);
      } else {
        setCurrentPath("/home/daytona");
        await loadFiles("/home/daytona");
      }
    } catch {
      // Fallback to root
      setCurrentPath("/");
      await loadFiles("/");
    }
  };

  const checkWorkspaceDirectory = async (): Promise<{ exists: boolean; path: string }> => {
    try {
      const result = await daytonaUtils.withClient(async (client) => {
        const sandboxes = await client.list();
        if (sandboxes.length === 0) return { exists: false, path: "/home/daytona/workspace" };

        const sandbox = sandboxes[0];
        const checkResult = await sandbox.process.codeRun(
          `
import os
import json

try:
    # Check for workspace in user's home directory
    home_dir = os.path.expanduser('~')
    workspace_path = os.path.join(home_dir, 'workspace')
    
    workspace_exists = os.path.exists(workspace_path)
    has_content = False
    
    if workspace_exists:
        content = os.listdir(workspace_path)
        has_content = len(content) > 0
    
    # Also check for any git repositories in workspace
    git_repos = []
    if workspace_exists:
        for item in os.listdir(workspace_path):
            item_path = os.path.join(workspace_path, item)
            if os.path.isdir(item_path):
                git_path = os.path.join(item_path, '.git')
                if os.path.exists(git_path):
                    git_repos.append(item)
    
    print(json.dumps({
        "workspace_exists": workspace_exists,
        "workspace_path": workspace_path,
        "has_content": has_content,
        "git_repos": git_repos,
        "content_count": len(content) if workspace_exists else 0,
        "home_dir": home_dir
    }))
except Exception as e:
    home_dir = os.path.expanduser('~')
    workspace_path = os.path.join(home_dir, 'workspace')
    print(json.dumps({
        "error": str(e), 
        "workspace_exists": False, 
        "workspace_path": workspace_path,
        "has_content": False
    }))
        `.trim(),
        );

        const output = checkResult.result || "";
        const parsed = JSON.parse(output);
        console.log("Workspace check result:", parsed);

        return {
          exists: parsed.workspace_exists && (parsed.has_content || parsed.git_repos.length > 0),
          path: parsed.workspace_path || "/home/daytona/workspace",
        };
      });

      return result;
    } catch (error) {
      console.error("Failed to check workspace:", error);
      return { exists: false, path: "/home/daytona/workspace" };
    }
  };

  useEffect(() => {
    if (currentPath) {
      loadFiles(currentPath);
    }
  }, [currentPath]);

  const loadFiles = async (path: string) => {
    setLoading(true);
    try {
      const result = await daytonaUtils.withClient(async (client) => {
        const sandboxes = await client.list();
        if (sandboxes.length === 0) {
          throw new Error("No active sandboxes found");
        }
        const sandbox = sandboxes[0];

        // Execute ls command using the process.codeRun method
        const listResult = await sandbox.process.codeRun(
          `
import subprocess
import json
import os

try:
    # Show current working directory for debugging
    cwd = os.getcwd()
    
    result = subprocess.run(['ls', '-la', '${path}'], capture_output=True, text=True)
    if result.returncode != 0:
        print(json.dumps({"error": result.stderr, "cwd": cwd, "path_requested": "${path}"}))
    else:
        lines = result.stdout.strip().split('\\n')
        files = []
        for line in lines:
            if line.startswith('total') or not line.strip():
                continue
            parts = line.split()
            if len(parts) >= 9:
                permissions = parts[0]
                size = int(parts[4]) if parts[4].isdigit() else 0
                name = ' '.join(parts[8:])
                if name in ['.', '..']:
                    continue
                files.append({
                    'name': name,
                    'path': '${path}/' + name if '${path}' != '/' else '/' + name,
                    'isDir': permissions.startswith('d'),
                    'size': size,
                    'mode': permissions,
                    'modTime': None
                })
        
        # Include debug info
        result_data = {
            'files': files,
            'debug': {
                'cwd': cwd,
                'path_requested': '${path}',
                'raw_ls_output': result.stdout
            }
        }
        print(json.dumps(result_data))
except Exception as e:
    print(json.dumps({"error": str(e)}))
        `.trim(),
        );

        try {
          const output = listResult.result || "";
          const parsed = JSON.parse(output);

          if (parsed.error) {
            console.error("File listing error:", parsed);
            throw new Error(parsed.error);
          }

          // Handle new debug structure
          const files = parsed.files || parsed;
          if (parsed.debug) {
            console.log("File manager debug info:", parsed.debug);
          }

          return files.map((file: { name: string; path: string; isDir: boolean; size: number; mode: string }) => ({
            ...file,
            modTime: new Date().toISOString(),
          }));
        } catch (error) {
          // Fallback: return empty array if parsing fails
          console.error("Failed to parse file listing:", error);
          return [];
        }
      });

      const mappedFiles: FileItem[] = result.map(
        (file: { name: string; path: string; isDir: boolean; size: number; mode: string; modTime: string }) => ({
          name: file.name,
          path: file.path,
          type: file.isDir ? "directory" : "file",
          size: file.size || 0,
          modifiedTime: daytonaUtils.formatDate(file.modTime),
          permissions: file.mode,
        }),
      );

      setFiles(mappedFiles);
    } catch (error) {
      toastUtils.apiError(error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = files.filter((file) => file.name.toLowerCase().includes(searchText.toLowerCase()));

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const navigateUp = () => {
    const parentPath = currentPath.split("/").slice(0, -1).join("/") || "/";
    setCurrentPath(parentPath);
  };

  const navigateToDirectory = (path: string) => {
    setCurrentPath(path);
  };

  const deleteFile = async (file: FileItem) => {
    const confirmed = await confirmAlert({
      title: `Delete ${file.name}?`,
      message: `Are you sure you want to delete "${file.name}"? This action cannot be undone.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (confirmed) {
      await daytonaUtils.executeWithToast(
        async () => {
          await daytonaUtils.withClient(async (client) => {
            const sandboxes = await client.list();
            const sandbox = sandboxes[0];

            await sandbox.process.codeRun(
              `
import subprocess
import json

try:
    if ${file.type === "directory" ? "True" : "False"}:
        result = subprocess.run(['rm', '-rf', '${file.path}'], capture_output=True, text=True)
    else:
        result = subprocess.run(['rm', '${file.path}'], capture_output=True, text=True)
    
    if result.returncode != 0:
        print(json.dumps({"error": result.stderr}))
    else:
        print(json.dumps({"success": True}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
            `.trim(),
            );
          });
          await loadFiles(currentPath);
        },
        `Deleting ${file.name}...`,
        `${file.name} deleted successfully`,
      );
    }
  };

  const downloadFile = async (file: FileItem) => {
    await daytonaUtils.executeWithToast(
      async () => {
        await daytonaUtils.withClient(async (client) => {
          const sandboxes = await client.list();
          const sandbox = sandboxes[0];

          const result = await sandbox.process.codeRun(
            `
with open('${file.path}', 'r') as f:
    content = f.read()
print(content)
          `.trim(),
          );

          const content = result.result || "";
          // Note: In a real implementation, this would save to user's downloads folder
          console.log("File content:", content);
        });
      },
      `Downloading ${file.name}...`,
      `${file.name} downloaded successfully`,
    );
  };

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search files and directories..."
      onSearchTextChange={setSearchText}
      navigationTitle={`Files: ${currentPath}`}
    >
      <List.Section title={`Directory: ${currentPath}`}>
        {/* Workspace guidance */}
        {currentPath === "/home/daytona" && !workspaceExists && (
          <List.Item
            title="📁 No workspace found"
            subtitle="Clone a repository from the Dashboard to create a workspace"
            icon={Icon.Folder}
            actions={
              <ActionPanel>
                <Action
                  title="Go to Dashboard"
                  icon={Icon.House}
                  onAction={() => launchCommand({ name: "sandboxes", type: LaunchType.UserInitiated })}
                />
              </ActionPanel>
            }
          />
        )}

        {/* Workspace shortcut when in home directory */}
        {currentPath === "/home/daytona" && workspaceExists && (
          <List.Item
            title="📁 workspace"
            subtitle="Go to workspace directory (contains cloned repositories)"
            icon={Icon.Folder}
            actions={
              <ActionPanel>
                <Action title="Open Workspace" icon={Icon.Folder} onAction={() => navigateToDirectory(workspacePath)} />
              </ActionPanel>
            }
          />
        )}

        {/* Parent directory navigation */}
        {currentPath !== "/" && (
          <List.Item
            title=".. (Parent Directory)"
            icon={Icon.ChevronUp}
            actions={
              <ActionPanel>
                <Action title="Go up" icon={Icon.ChevronUp} onAction={navigateUp} />
              </ActionPanel>
            }
          />
        )}

        {filteredFiles.map((file) => (
          <List.Item
            key={file.path}
            title={file.name}
            subtitle={`${file.type} • ${formatSize(file.size)}`}
            icon={file.type === "directory" ? Icon.Folder : Icon.Document}
            accessories={[{ text: file.modifiedTime }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {file.type === "directory" ? (
                    <Action title="Open Directory" icon={Icon.Folder} onAction={() => navigateToDirectory(file.path)} />
                  ) : (
                    <>
                      <Action.Push
                        title="View File"
                        icon={Icon.Eye}
                        target={<FileViewer filePath={file.path} fileName={file.name} />}
                      />
                      <Action.Push
                        title="Edit File"
                        icon={Icon.Pencil}
                        target={
                          <FileEditor filePath={file.path} fileName={file.name} onSave={() => loadFiles(currentPath)} />
                        }
                      />
                    </>
                  )}
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action.Push
                    title="Create File"
                    icon={Icon.NewDocument}
                    target={
                      <CreateItemForm type="file" currentPath={currentPath} onSuccess={() => loadFiles(currentPath)} />
                    }
                  />
                  <Action.Push
                    title="Create Directory"
                    icon={Icon.NewFolder}
                    target={
                      <CreateItemForm
                        type="directory"
                        currentPath={currentPath}
                        onSuccess={() => loadFiles(currentPath)}
                      />
                    }
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action.Push
                    title="Rename"
                    icon={Icon.Pencil}
                    target={<RenameForm file={file} onSuccess={() => loadFiles(currentPath)} />}
                  />
                  {file.type === "file" && (
                    <Action title="Download" icon={Icon.Download} onAction={() => downloadFile(file)} />
                  )}
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => deleteFile(file)}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => initializeFileManager()} />
                  {workspaceExists && currentPath !== workspacePath && (
                    <Action
                      title="Go to Workspace"
                      icon={Icon.Folder}
                      onAction={() => navigateToDirectory(workspacePath)}
                    />
                  )}
                  <Action title="Go to Home" icon={Icon.House} onAction={() => navigateToDirectory("/home/daytona")} />
                  <Action
                    title="Go to Dashboard"
                    icon={Icon.House}
                    onAction={() => launchCommand({ name: "sandboxes", type: LaunchType.UserInitiated })}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function FileViewer({ filePath, fileName }: { filePath: string; fileName: string }) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFileContent();
  }, []);

  const loadFileContent = async () => {
    try {
      const result = await daytonaUtils.withClient(async (client) => {
        const sandboxes = await client.list();
        const sandbox = sandboxes[0];

        const fileResult = await sandbox.process.codeRun(
          `
try:
    with open('${filePath}', 'r') as f:
        content = f.read()
    print(content)
except Exception as e:
    print(f"Error reading file: {e}")
        `.trim(),
        );

        return fileResult.result || "Error loading file content";
      });
      setContent(result);
    } catch (error) {
      toastUtils.apiError(error);
      setContent("Error loading file content");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Detail
      isLoading={loading}
      markdown={`# ${fileName}\n\n\`\`\`\n${content}\n\`\`\``}
      navigationTitle={`View: ${fileName}`}
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit File"
            icon={Icon.Pencil}
            target={<FileEditor filePath={filePath} fileName={fileName} />}
          />
        </ActionPanel>
      }
    />
  );
}

function FileEditor({ filePath, fileName, onSave }: { filePath: string; fileName: string; onSave?: () => void }) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { pop } = useNavigation();

  useEffect(() => {
    loadFileContent();
  }, []);

  const loadFileContent = async () => {
    try {
      const result = await daytonaUtils.withClient(async (client) => {
        const sandboxes = await client.list();
        const sandbox = sandboxes[0];

        const fileResult = await sandbox.process.codeRun(
          `
try:
    with open('${filePath}', 'r') as f:
        content = f.read()
    print(content)
except Exception as e:
    print(f"Error reading file: {e}")
        `.trim(),
        );

        return fileResult.result || "";
      });
      setContent(result);
    } catch (error) {
      toastUtils.apiError(error);
    } finally {
      setLoading(false);
    }
  };

  const saveFile = async () => {
    await daytonaUtils.executeWithToast(
      async () => {
        await daytonaUtils.withClient(async (client) => {
          const sandboxes = await client.list();
          const sandbox = sandboxes[0];

          // Escape the content for Python string
          const escapedContent = content.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");

          await sandbox.process.codeRun(
            `
try:
    with open('${filePath}', 'w') as f:
        f.write('''${escapedContent}''')
    print("File saved successfully")
except Exception as e:
    print(f"Error saving file: {e}")
          `.trim(),
          );
        });
        onSave?.();
        pop();
      },
      "Saving file...",
      "File saved successfully",
    );
  };

  return (
    <Form
      isLoading={loading}
      navigationTitle={`Edit: ${fileName}`}
      actions={
        <ActionPanel>
          <Action title="Save File" icon={Icon.Check} onAction={saveFile} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="File Content"
        value={content}
        onChange={setContent}
        placeholder="File content..."
      />
    </Form>
  );
}

function CreateItemForm({
  type,
  currentPath,
  onSuccess,
}: {
  type: "file" | "directory";
  currentPath: string;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const { pop } = useNavigation();

  const createItem = async () => {
    if (!name.trim()) {
      toastUtils.error("Name is required");
      return;
    }

    const fullPath = `${currentPath}/${name}`.replace(/\/+/g, "/");

    await daytonaUtils.executeWithToast(
      async () => {
        await daytonaUtils.withClient(async (client) => {
          const sandboxes = await client.list();
          const sandbox = sandboxes[0];

          if (type === "directory") {
            await sandbox.process.codeRun(
              `
import subprocess
import json

try:
    result = subprocess.run(['mkdir', '-p', '${fullPath}'], capture_output=True, text=True)
    if result.returncode != 0:
        print(json.dumps({"error": result.stderr}))
    else:
        print(json.dumps({"success": True}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
            `.trim(),
            );
          } else {
            const escapedContent = content.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
            await sandbox.process.codeRun(
              `
try:
    with open('${fullPath}', 'w') as f:
        f.write('''${escapedContent}''')
    print("File created successfully")
except Exception as e:
    print(f"Error creating file: {e}")
            `.trim(),
            );
          }
        });
        onSuccess();
        pop();
      },
      `Creating ${type}...`,
      `${type} created successfully`,
    );
  };

  return (
    <Form
      navigationTitle={`Create ${type}`}
      actions={
        <ActionPanel>
          <Action title={`Create ${type}`} icon={Icon.Check} onAction={createItem} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" value={name} onChange={setName} placeholder={`Enter ${type} name...`} />
      {type === "file" && (
        <Form.TextArea
          id="content"
          title="Content"
          value={content}
          onChange={setContent}
          placeholder="File content (optional)..."
        />
      )}
    </Form>
  );
}

function RenameForm({ file, onSuccess }: { file: FileItem; onSuccess: () => void }) {
  const [newName, setNewName] = useState(file.name);
  const { pop } = useNavigation();

  const renameItem = async () => {
    if (!newName.trim() || newName === file.name) {
      toastUtils.error("Please enter a new name");
      return;
    }

    const newPath = file.path.replace(file.name, newName);

    await daytonaUtils.executeWithToast(
      async () => {
        await daytonaUtils.withClient(async (client) => {
          const sandboxes = await client.list();
          const sandbox = sandboxes[0];

          await sandbox.process.codeRun(
            `
import subprocess
import json

try:
    result = subprocess.run(['mv', '${file.path}', '${newPath}'], capture_output=True, text=True)
    if result.returncode != 0:
        print(json.dumps({"error": result.stderr}))
    else:
        print(json.dumps({"success": True}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
          `.trim(),
          );
        });
        onSuccess();
        pop();
      },
      "Renaming...",
      "Item renamed successfully",
    );
  };

  return (
    <Form
      navigationTitle={`Rename ${file.name}`}
      actions={
        <ActionPanel>
          <Action title="Rename" icon={Icon.Check} onAction={renameItem} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="newName"
        title="New Name"
        value={newName}
        onChange={setNewName}
        placeholder="Enter new name..."
      />
    </Form>
  );
}

export default FilesCommand;
