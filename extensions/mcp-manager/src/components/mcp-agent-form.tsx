import path from "path";
import fs from "fs";
import { McpContent, McpFile } from "../types";
import { homedir } from "os";
import { useEffect, useMemo, useState } from "react";
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";

export default function McpAgentForm({ files, onSave }: { files: McpFile[]; onSave: () => void }) {
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
  }, [files]);

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
        title: "MCP Agent save complete",
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
          <Action.SubmitForm title="Save as Mcp Agent" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="MCP Agent Name"
        placeholder="my-mcp-agent"
        info={files.length > 0 ? `Will be created from ${files.length} selected files` : "Enter MCP Agent name"}
      />
      <Form.TextField id="description" title="Description" placeholder="Enter a description for your MCP Agent" />
      <Form.TextArea
        id="content"
        title="JSON Content"
        defaultValue={initialContent}
        placeholder='{
  "mcpServers": {
    "your-server-name": {
      "tools": []
    }
  }
}'
        error={jsonError}
        onChange={(value) => validateJson(value)}
        info="Must be valid JSON format"
        enableMarkdown={false}
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
