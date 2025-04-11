import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import fs from "fs";
import { homedir } from "os";
import path from "path";
import { useEffect, useState } from "react";
import McpAgentForm from "./components/mcp-agent-form";
import McpToolsForm from "./components/mcp-tools-form";
import { Agent, McpContent, McpFile } from "./types";
import { getDescription } from "./utils";

export default function Command() {
  const { push } = useNavigation();
  const mcpDir = path.join(homedir(), "Library", "Application Support", "Raycast", "extensions", "mcp-manager", "data");
  const templateDir = path.join(mcpDir, "templates");
  const [mcpFiles, setMcpFiles] = useState<McpFile[]>([]);
  const [templates, setTemplates] = useState<Agent[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [currentView, setCurrentView] = useState<"tools" | "agent">("agent");

  // MCP 파일 목록 읽기
  const getMcpFiles = (): McpFile[] => {
    try {
      if (!fs.existsSync(mcpDir)) {
        fs.mkdirSync(mcpDir, { recursive: true });
        return [];
      }

      const files = fs.readdirSync(mcpDir);
      return files
        .filter((file) => file.endsWith(".json") && !file.endsWith(".description"))
        .map((file) => {
          const filePath = path.join(mcpDir, file);
          const content = fs.readFileSync(filePath, "utf-8");
          const description = getDescription(filePath);
          return {
            name: file,
            content,
            filePath,
            description,
          };
        });
    } catch (error) {
      console.error("Failed to read MCP files:", error);
      return [];
    }
  };

  // 템플릿 목록 읽기
  const getTemplates = (): Agent[] => {
    try {
      if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true });
        return [];
      }

      const files = fs.readdirSync(templateDir);
      return files
        .filter((file) => file.endsWith(".json"))
        .map((file) => {
          const filePath = path.join(templateDir, file);
          const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          return {
            name: file,
            files: content.files,
            description: content.description,
          };
        });
    } catch (error) {
      console.error("Failed to read MCP Agent:", error);
      return [];
    }
  };

  // 선택된 파일들을 하나의 JSON으로 병합
  const mergeMcpFiles = (target: "cursor" | "claude" | "both" = "both") => {
    try {
      const mergedContent: McpContent = {
        mcpServers: {},
      };

      mcpFiles
        .filter((file) => selectedFiles.has(file.name))
        .forEach((file) => {
          const content = JSON.parse(file.content);
          if (content.mcpServers) {
            mergedContent.mcpServers = {
              ...mergedContent.mcpServers,
              ...content.mcpServers,
            };
          }
        });

      const cursorMcpPath = path.join(homedir(), ".cursor", "mcp.json");
      const claudeMcpPath = path.join(
        homedir(),
        "Library",
        "Application Support",
        "Claude",
        "claude_desktop_config.json",
      );

      // Cursor MCP 적용
      if (target === "cursor" || target === "both") {
        fs.writeFileSync(cursorMcpPath, JSON.stringify(mergedContent, null, 2));
      }

      // Claude MCP 적용
      if (target === "claude" || target === "both") {
        const claudeDir = path.join(homedir(), "Library", "Application Support", "Claude");
        if (!fs.existsSync(claudeDir)) {
          fs.mkdirSync(claudeDir, { recursive: true });
        }
        fs.writeFileSync(claudeMcpPath, JSON.stringify(mergedContent, null, 2));
      }

      showToast({
        title:
          target === "both"
            ? "Selected files have been successfully applied to Cursor and Claude"
            : `Selected files have been successfully applied to ${target === "cursor" ? "Cursor" : "Claude"}`,
        style: Toast.Style.Success,
      });

      // 선택 초기화
      setSelectedFiles(new Set());
    } catch (error) {
      showToast({
        title: "File merge failed",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      });
    }
  };

  // 템플릿 적용
  const applyTemplate = (template: Agent) => {
    try {
      const mergedContent: McpContent = {
        mcpServers: {},
      };

      template.files.forEach((file) => {
        if (file.content.mcpServers) {
          mergedContent.mcpServers = {
            ...mergedContent.mcpServers,
            ...file.content.mcpServers,
          };
        }
      });

      const cursorMcpPath = path.join(homedir(), ".cursor", "mcp.json");
      const claudeMcpPath = path.join(
        homedir(),
        "Library",
        "Application Support",
        "Claude",
        "claude_desktop_config.json",
      );

      // Cursor MCP 적용
      fs.writeFileSync(cursorMcpPath, JSON.stringify(mergedContent, null, 2));

      // Claude MCP 적용
      const claudeDir = path.join(homedir(), "Library", "Application Support", "Claude");
      if (!fs.existsSync(claudeDir)) {
        fs.mkdirSync(claudeDir, { recursive: true });
      }
      fs.writeFileSync(claudeMcpPath, JSON.stringify(mergedContent, null, 2));

      showToast({
        title: "MCP Agent has been successfully applied to Cursor and Claude",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "MCP Agent application failed",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      });
    }
  };

  // 파일 목록 업데이트
  const updateMcpFiles = () => {
    setMcpFiles(getMcpFiles());
  };

  // 초기 파일 목록 로드
  useEffect(() => {
    updateMcpFiles();
    setTemplates(getTemplates());
  }, []);

  const handleDelete = (file: McpFile) => {
    try {
      fs.unlinkSync(file.filePath);
      // description 파일도 삭제
      const descriptionPath = `${file.filePath}.description`;
      if (fs.existsSync(descriptionPath)) {
        fs.unlinkSync(descriptionPath);
      }
      updateMcpFiles();
      showToast({
        title: "Delete complete",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "Delete failed",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      });
    }
  };

  return (
    <List
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select View"
          storeValue={true}
          value={currentView}
          onChange={(value) => setCurrentView(value as "tools" | "agent")}
        >
          <List.Dropdown.Item title="MCP Agent" value="agent" />
          <List.Dropdown.Item title="MCP Tools" value="tools" />
        </List.Dropdown>
      }
      navigationTitle={currentView === "tools" ? "MCP Tools" : "MCP Agent"}
      actions={
        <ActionPanel>
          <Action
            title="Create New MCP Tools"
            onAction={() => push(<McpToolsForm onSave={updateMcpFiles} />)}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      {currentView === "tools" ? (
        <>
          <List.EmptyView
            title="No MCP files"
            description="Create a new MCP file"
            icon="✨"
            actions={
              <ActionPanel>
                <Action
                  title="Create New MCP File"
                  onAction={() => push(<McpToolsForm onSave={updateMcpFiles} />)}
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel>
            }
          />
          <List.Section>
            {mcpFiles.map((file) => (
              <List.Item
                key={file.name}
                title={file.name.replace(/\.json$/, "")}
                subtitle={file.description || undefined}
                accessories={[
                  {
                    icon: selectedFiles.has(file.name) ? Icon.CircleProgress100 : Icon.Circle,
                    tooltip: selectedFiles.has(file.name) ? "Selected" : "Not selected",
                  },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={`\`\`\`json\n${JSON.stringify(JSON.parse(file.content), null, 2)}\n\`\`\``}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="Apply to Cursor and Claude"
                      onAction={() => mergeMcpFiles("both")}
                      icon={Icon.CheckCircle}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                    />
                    <Action title="Apply to Cursor" onAction={() => mergeMcpFiles("cursor")} icon={Icon.CheckCircle} />
                    <Action title="Apply to Claude" onAction={() => mergeMcpFiles("claude")} icon={Icon.CheckCircle} />
                    <Action
                      title="Edit"
                      onAction={() => push(<McpToolsForm existingFile={file} onSave={updateMcpFiles} />)}
                      icon={Icon.Pencil}
                    />
                    <Action
                      title="Create New Mcp Tools"
                      onAction={() => push(<McpToolsForm onSave={updateMcpFiles} />)}
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                    <Action
                      title="Save as Mcp Agent"
                      onAction={() => {
                        const filesToSave =
                          selectedFiles.size > 0 ? mcpFiles.filter((f) => selectedFiles.has(f.name)) : [file];

                        push(
                          <McpAgentForm
                            files={filesToSave}
                            onSave={() => {
                              setTemplates(getTemplates());
                              setSelectedFiles(new Set());
                            }}
                          />,
                        );
                      }}
                      icon={Icon.SaveDocument}
                    />
                    <Action
                      title="Delete"
                      onAction={() => handleDelete(file)}
                      style={Action.Style.Destructive}
                      icon={Icon.Trash}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      ) : (
        <>
          <List.EmptyView
            title="No MCP Agents"
            description="Select files to create a new MCP Agent"
            icon="✨"
            actions={
              <ActionPanel>
                <Action
                  title="Create New MCP Agent"
                  onAction={() => push(<McpAgentForm files={[]} onSave={() => setTemplates(getTemplates())} />)}
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel>
            }
          />
          <List.Section>
            {templates.map((template) => (
              <List.Item
                key={template.name}
                title={template.name.replace(/\.json$/, "")}
                subtitle={template.description || undefined}
                detail={
                  <List.Item.Detail
                    markdown={`\n${template.files
                      .map((file) => `\`\`\`json\n${JSON.stringify(file.content, null, 2)}\n\`\`\``)
                      .join("\n")}`}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="Apply to Cursor and Claude"
                      onAction={() => applyTemplate(template)}
                      icon={Icon.CheckCircle}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                    />
                    <Action
                      title="Edit"
                      onAction={() => {
                        const templateContent = JSON.parse(
                          fs.readFileSync(path.join(templateDir, template.name), "utf-8"),
                        );
                        push(
                          <McpAgentForm
                            files={[]}
                            existingTemplate={{
                              name: template.name,
                              description: template.description || "",
                              content: templateContent.files[0].content,
                            }}
                            onSave={() => setTemplates(getTemplates())}
                          />,
                        );
                      }}
                      icon={Icon.Pencil}
                    />
                    <Action
                      title="Create New MCP Agent"
                      onAction={() => push(<McpAgentForm files={[]} onSave={() => setTemplates(getTemplates())} />)}
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                    <Action
                      title="Delete"
                      onAction={() => {
                        const templatePath = path.join(templateDir, template.name);
                        fs.unlinkSync(templatePath);
                        setTemplates(getTemplates());
                        showToast({
                          title: "MCP Agent delete complete",
                          style: Toast.Style.Success,
                        });
                      }}
                      style={Action.Style.Destructive}
                      icon={Icon.Trash}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
