import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { homedir } from "os";
import path from "path";
import { useEffect, useState } from "react";
import fs from "fs";
import { McpFile } from "../types";
import { getDescription } from "../utils";

export default function McpToolsForm({
  existingFile,
  onSave,
  defaultContent,
}: {
  existingFile?: McpFile;
  onSave: () => void;
  defaultContent?: string;
}) {
  const [jsonError, setJsonError] = useState<string>("");
  const mcpDir = path.join(homedir(), "Library", "Application Support", "Raycast", "extensions", "mcp-manager", "data");
  const cursorMcpPath = path.join(homedir(), ".cursor", "mcp.json");

  useEffect(() => {
    // MCP 디렉토리 생성
    if (!fs.existsSync(mcpDir)) {
      fs.mkdirSync(mcpDir, { recursive: true });
    }
    // .cursor 디렉토리 생성
    const cursorDir = path.join(homedir(), ".cursor");
    if (!fs.existsSync(cursorDir)) {
      fs.mkdirSync(cursorDir, { recursive: true });
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

      const fileName = values.name.endsWith(".json") ? values.name : `${values.name}.json`;
      const filePath = path.join(mcpDir, fileName);

      // 기존 파일이 있고 이름이 변경된 경우 기존 파일 삭제
      if (existingFile && existingFile.name !== fileName) {
        fs.unlinkSync(existingFile.filePath);
      }

      // JSON 파일 저장 (description 제외)
      const contentObj = JSON.parse(values.content);
      fs.writeFileSync(filePath, JSON.stringify(contentObj, null, 2));

      // description을 별도 파일로 저장
      const descriptionPath = path.join(mcpDir, `${fileName}.description`);
      fs.writeFileSync(descriptionPath, values.description);

      // 부모 컴포넌트에 저장 완료 알림
      onSave();

      showToast({
        title: existingFile ? "Update Complete" : "Save Complete",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "Save Failed",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      });
    }
  };

  const applyCursor = (values: { name: string; content: string }) => {
    try {
      if (!validateJson(values.content)) return;

      fs.writeFileSync(cursorMcpPath, values.content);
      showToast({
        title: "Cursor MCP file update complete",
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "Cursor MCP file update failed",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={existingFile ? "Update" : "Save"} onSubmit={handleSubmit} />
          <Action.SubmitForm
            title="Apply to Cursor Mcp"
            onSubmit={applyCursor}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="File Name"
        placeholder="my-mcp-tools"
        defaultValue={existingFile?.name.replace(/\.json$/, "")}
        info="File extension (.json) will be added automatically"
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Enter a description for your MCP Tools"
        defaultValue={existingFile ? getDescription(existingFile.filePath) : ""}
      />
      <Form.TextArea
        id="content"
        title="JSON Content"
        placeholder='{
  "key": "value"
}'
        defaultValue={existingFile?.content || defaultContent}
        error={jsonError}
        onChange={(value) => validateJson(value)}
        info="Must be valid JSON format"
        enableMarkdown={false}
      />
    </Form>
  );
}
