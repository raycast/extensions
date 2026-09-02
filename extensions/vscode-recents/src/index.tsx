import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  closeMainWindow,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec, execSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import path from "path";

interface ProjectItem {
  id: string;
  name: string;
  path: string;
  type: "folder" | "workspace" | "remote" | "file";
  extension: string;
}

// GitHub Dark Theme 色彩配置
const GITHUB_COLORS = {
  blue: "#58A6FF",
  green: "#3FB950",
  purple: "#A371F7",
  yellow: "#D29922",
  gray: "#8B949E",
};

export default function Command() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    function getVscDatabasePath(): string | null {
      // 1. VS Code 1.118+ 新版共享存储路径
      const sharedPath = path.join(
        homedir(),
        ".vscode-shared/sharedStorage/state.vscdb",
      );
      if (existsSync(sharedPath)) return sharedPath;

      // 2. macOS 传统全局用户存储路径
      const legacyPath = path.join(
        homedir(),
        "Library/Application Support/Code/User/globalStorage/state.vscdb",
      );
      if (existsSync(legacyPath)) return legacyPath;

      // 3. Code - Insiders / Code Next 独立存储路径
      const insiderPath = path.join(
        homedir(),
        "Library/Application Support/Code - Insiders/User/globalStorage/state.vscdb",
      );
      if (existsSync(insiderPath)) return insiderPath;

      return null;
    }

    function loadRecentProjects() {
      try {
        const dbPath = getVscDatabasePath();

        if (!dbPath) {
          throw new Error("未检测到 VS Code 的数据库文件 (state.vscdb)");
        }

        const queryCommand = `sqlite3 "${dbPath}" "SELECT value FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList';"`;

        let rawResult = "";
        try {
          rawResult = execSync(queryCommand, { encoding: "utf-8" }).trim();
        } catch (e: any) {
          throw new Error(`SQLite 读取失败: ${e?.message || String(e)}`);
        }

        if (!rawResult) {
          throw new Error("成功读取数据库，但历史记录为空");
        }

        const jsonStartIndex = rawResult.indexOf("{");
        if (jsonStartIndex === -1) {
          throw new Error(`返回内容非合法 JSON: ${rawResult.slice(0, 50)}...`);
        }
        const cleanedJsonText = rawResult.slice(jsonStartIndex);

        let jsonVal: any;
        try {
          jsonVal = JSON.parse(cleanedJsonText);
        } catch (e: any) {
          throw new Error(`JSON 解析失败: ${e?.message || "格式错误"}`);
        }

        const entries = jsonVal.entries || jsonVal.workspaces || [];

        if (!Array.isArray(entries) || entries.length === 0) {
          throw new Error("最近项目列表为空");
        }

        // 先过滤无效条目，再映射转换，完美解决 TypeScript 类型推導报错 (TS2322)
        const parsedProjects: ProjectItem[] = entries
          .filter((entry: any) =>
            Boolean(
              entry &&
              (typeof entry === "string" ||
                entry.folderUri ||
                entry.workspace?.configPath ||
                entry.fileUri ||
                entry.remoteAuthority),
            ),
          )
          .map((entry: any, index: number) => {
            let uriStr = "";
            let itemType: ProjectItem["type"] = "folder";

            if (typeof entry === "string") {
              uriStr = entry;
            } else if (entry.folderUri) {
              uriStr = entry.folderUri;
              itemType = "folder";
            } else if (entry.workspace?.configPath) {
              uriStr = entry.workspace.configPath;
              itemType = "workspace";
            } else if (entry.fileUri) {
              uriStr = entry.fileUri;
              itemType = "file";
            } else if (entry.remoteAuthority) {
              uriStr = entry.folderUri || entry.fileUri || "";
              itemType = "remote";
            }

            if (uriStr.startsWith("vscode-remote://")) {
              itemType = "remote";
            }

            let filePath = decodeURIComponent(uriStr.replace(/^file:\/\//, ""));
            const fileName = path.basename(filePath) || filePath;
            const ext = path.extname(filePath).toLowerCase().replace(".", "");

            return {
              id: `${filePath}-${index}`,
              name: fileName,
              path: filePath,
              type: itemType,
              extension: ext,
            };
          });

        if (parsedProjects.length === 0) {
          throw new Error("未能解析出任何有效路径");
        }

        setProjects(parsedProjects);
      } catch (error: any) {
        const message = error?.message || String(error);
        setErrorDetails(message);
        showToast({
          style: Toast.Style.Failure,
          title: "读取最近项目失败",
          message,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadRecentProjects();
  }, []);

  // 尝试打开项目并在成功后关闭主窗口
  const openProject = async (projectPath: string) => {
    const commandsToTry = [
      `code-next "${projectPath}"`,
      `code "${projectPath}"`,
      `open -a "Visual Studio Code" "${projectPath}"`,
    ];

    const executeCommand = (cmd: string) =>
      new Promise<boolean>((resolve) => {
        exec(cmd, (err) => {
          resolve(!err);
        });
      });

    for (const cmd of commandsToTry) {
      const success = await executeCommand(cmd);
      if (success) {
        showToast({
          style: Toast.Style.Success,
          title: "Opening in VS Code...",
        });
        await closeMainWindow();
        return;
      }
    }

    showToast({
      style: Toast.Style.Failure,
      title: "Could not open project",
      message: "Please verify VS Code CLI or App installation",
    });
  };

  // GitHub 风格：图标映射
  const getGitHubStyleIcon = (item: ProjectItem) => {
    if (item.type === "remote") {
      return { source: Icon.Globe, tintColor: GITHUB_COLORS.green };
    }
    if (item.type === "workspace") {
      return { source: Icon.Box, tintColor: GITHUB_COLORS.purple };
    }
    if (item.type === "folder") {
      return { source: Icon.Folder, tintColor: GITHUB_COLORS.blue };
    }

    switch (item.extension) {
      case "ts":
      case "tsx":
        return { source: Icon.CodeBlock, tintColor: GITHUB_COLORS.blue };
      case "js":
      case "jsx":
        return { source: Icon.CodeBlock, tintColor: GITHUB_COLORS.yellow };
      case "json":
        return { source: Icon.Gear, tintColor: GITHUB_COLORS.gray };
      case "md":
        return { source: Icon.Document, tintColor: Color.PrimaryText };
      case "py":
        return { source: Icon.Code, tintColor: GITHUB_COLORS.green };
      default:
        return { source: Icon.Document, tintColor: GITHUB_COLORS.gray };
    }
  };

  // GitHub 风格：标签名称映射
  const getBadgeText = (item: ProjectItem) => {
    switch (item.type) {
      case "remote":
        return "Remote Container";
      case "workspace":
        return "Workspace";
      case "folder":
        return "Directory";
      case "file":
        return item.extension ? `.${item.extension} file` : "File";
      default:
        return "Repository";
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search repositories & projects..."
    >
      {errorDetails ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load projects"
          description={errorDetails}
        />
      ) : (
        projects.map((item) => (
          <List.Item
            key={item.id}
            icon={getGitHubStyleIcon(item)}
            title={item.name}
            subtitle={item.path}
            accessories={[
              {
                tag: {
                  value: getBadgeText(item),
                  color:
                    item.type === "workspace"
                      ? GITHUB_COLORS.purple
                      : item.type === "remote"
                        ? GITHUB_COLORS.green
                        : GITHUB_COLORS.gray,
                },
              },
            ]}
            actions={
              <ActionPanel title="Repository Actions">
                <Action
                  title="Open in VS Code"
                  icon={Icon.Terminal}
                  onAction={() => openProject(item.path)}
                />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={item.path}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Terminal Command"
                  content={`code "${item.path}"`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
