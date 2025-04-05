import path from "path";
import fs from "fs";
import { McpContent, McpFile } from "../types";
import { homedir } from "os";
import { useEffect, useMemo, useState } from "react";
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";

export default function McpAgentForm({
  files,
  onSave,
  existingTemplate,
}: {
  files: McpFile[];
  onSave: () => void;
  existingTemplate?: {
    name: string;
    description: string;
    content: McpContent;
  };
}) {
  const templateDir = path.join(
    homedir(),
    "Library",
    "Application Support",
    "Raycast",
    "extensions",
    "mcp-manager",
    "data",
    "templates",
  );
  const [jsonError, setJsonError] = useState<string>("");

  // 초기 JSON 내용 생성
  const initialContent = useMemo(() => {
    if (existingTemplate) {
      return JSON.stringify(existingTemplate.content, null, 2);
    }
    if (files.length === 0) return "";

    const mergedContent: McpContent = {
      mcpServers: {},
    };

    files.forEach((file) => {
      const content = JSON.parse(file.content);
      if (content.mcpServers) {
        mergedContent.mcpServers = {
          ...mergedContent.mcpServers,
          ...content.mcpServers,
        };
      }
    });

    return JSON.stringify(mergedContent, null, 2);
  }, [files, existingTemplate]);

  useEffect(() => {
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }
  }, []);

  const validateJson = (value: string): boolean => {
    try {
      JSON.parse(value);
      setJsonError("");
      return true;
    } catch {
      setJsonError("Invalid JSON format");
      return false;
    }
  };

  const handleSubmit = (values: { name: string; description: string; content: string }) => {
    try {
      if (!validateJson(values.content)) return;

      const templateName = values.name.endsWith(".json") ? values.name : `${values.name}.json`;
      const templatePath = path.join(templateDir, templateName);

      // 기존 템플릿이 있고 이름이 변경된 경우 기존 파일 삭제
      if (existingTemplate && existingTemplate.name !== templateName) {
        const oldTemplatePath = path.join(templateDir, existingTemplate.name);
        if (fs.existsSync(oldTemplatePath)) {
          fs.unlinkSync(oldTemplatePath);
        }
      }

      const content = JSON.parse(values.content);
      const templateContent = {
        description: values.description,
        files: [
          {
            name: templateName,
            content: content,
          },
        ],
      };

      fs.writeFileSync(templatePath, JSON.stringify(templateContent, null, 2));
      onSave();

      showToast({
        title: existingTemplate ? "MCP Agent update complete" : "MCP Agent save complete",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "MCP Agent save failed",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={existingTemplate ? "Update Mcp Agent" : "Save as Mcp Agent"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={existingTemplate?.name.replace(/\.json$/, "") || ""}
        placeholder="Enter agent name"
      />
      <Form.TextField
        id="description"
        title="Description"
        defaultValue={existingTemplate?.description || ""}
        placeholder="Enter description"
      />
      <Form.TextArea
        id="content"
        title="Content"
        defaultValue={initialContent}
        placeholder="Enter JSON content"
        error={jsonError}
        onChange={(value) => validateJson(value)}
      />
      {files.length > 0 && (
        <Form.Description
          title="Included Files"
          text={files.map((file) => file.name.replace(/\.json$/, "")).join(", ")}
        />
      )}
    </Form>
  );
}
