import { Action, Toast, showToast, Form, ActionPanel, useNavigation, Icon } from "@raycast/api";
import { Prompt } from "../types";
import * as fs from "fs/promises";
import { useState } from "react";
import fetch from "node-fetch";
import { nanoid } from "nanoid";
import { showFailureToast } from "@raycast/utils";

interface ImportPromptsActionProps {
  onImport: (prompts: Prompt[]) => void;
  currentPrompts?: Prompt[]; // 添加当前提示词列表参数
}

// 验证提示词数据并添加缺失的必要字段
function validateAndFixPrompt(obj: unknown): Prompt | null {
  if (!obj || typeof obj !== "object") {
    return null;
  }

  const record = obj as Record<string, unknown>;

  // 检查必要字段
  if (
    typeof record.title !== "string" ||
    typeof record.content !== "string" ||
    (record.tags !== undefined && !Array.isArray(record.tags))
  ) {
    return null;
  }

  // 创建一个符合 Prompt 接口的对象，为缺失字段设置默认值
  return {
    id: typeof record.id === "string" ? record.id : nanoid(),
    title: record.title as string,
    content: record.content as string,
    tags: Array.isArray(record.tags) ? record.tags : undefined,
    enabled: typeof record.enabled === "boolean" ? record.enabled : true,
  };
}

// 处理合并提示词数据的通用函数
function mergePrompts(
  importedPrompts: Prompt[],
  currentPrompts: Prompt[] = [],
): { mergedPrompts: Prompt[]; stats: { added: number; updated: number } } {
  // 处理导入的数据
  const stats = {
    added: 0,
    updated: 0,
  };

  // 合并数据：新数据将覆盖同ID的旧数据，不同ID的数据将被添加
  const mergedPrompts = [...currentPrompts]; // 复制当前提示词列表

  importedPrompts.forEach((importedPrompt) => {
    const existingIndex = mergedPrompts.findIndex((p) => p.id === importedPrompt.id);

    if (existingIndex >= 0) {
      // 更新现有项
      mergedPrompts[existingIndex] = importedPrompt;
      stats.updated++;
    } else {
      // 添加新项
      mergedPrompts.push(importedPrompt);
      stats.added++;
    }
  });

  return { mergedPrompts, stats };
}

// 导入表单组件
function ImportForm({ onImport, currentPrompts = [] }: ImportPromptsActionProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [urlError, setUrlError] = useState<string | undefined>();
  const [importMethod, setImportMethod] = useState<"file" | "url">("file");

  const validateUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const handleImport = async (values: { filePath?: string[]; url?: string }) => {
    const { filePath, url } = values;

    // 验证输入
    if (importMethod === "file" && (!filePath || filePath.length === 0)) {
      showFailureToast("Please select a file", { title: "Import Failed" });
      return;
    }

    if (importMethod === "url") {
      if (!url) {
        setUrlError("Please enter a valid URL");
        return;
      }

      if (!validateUrl(url)) {
        setUrlError("Please enter a valid URL");
        return;
      }
    }

    setIsImporting(true);

    try {
      let importData: unknown[];

      // 根据选择的方式导入数据
      if (importMethod === "file" && filePath && filePath.length > 0) {
        // 从文件导入
        const fileContent = await fs.readFile(filePath[0], "utf-8");
        importData = JSON.parse(fileContent);
      } else if (importMethod === "url" && url) {
        // 从URL导入
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Server returned an error: ${response.status} ${response.statusText}`);
        }

        importData = await response.json();
      } else {
        throw new Error("No import method selected");
      }

      if (!Array.isArray(importData)) {
        throw new Error("Invalid prompt data format: not an array");
      }

      // 验证和修复每个导入的提示词
      const validPrompts: Prompt[] = [];
      for (const item of importData) {
        const validPrompt = validateAndFixPrompt(item);
        if (validPrompt) {
          validPrompts.push(validPrompt);
        }
      }

      if (validPrompts.length === 0) {
        throw new Error("No valid prompt data found");
      }

      // 使用通用合并函数处理数据
      const { mergedPrompts, stats } = mergePrompts(validPrompts, currentPrompts);

      // 将合并后的数据传递给onImport
      onImport(mergedPrompts);

      await showToast({
        style: Toast.Style.Success,
        title: "Import Success",
        message: `Imported ${validPrompts.length} prompts (Added: ${stats.added}, Updated: ${stats.updated})`,
      });
    } catch (error) {
      showFailureToast(error, { title: "Import Failed" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Form
      navigationTitle="Import Prompts"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" onSubmit={handleImport} />
        </ActionPanel>
      }
      isLoading={isImporting}
    >
      <Form.Description
        title="Import Instructions"
        text="Please select to import prompt data from a local file or a remote URL. When importing, the data will be merged: prompts with the same ID will be updated, and prompts with different IDs will be added."
      />
      <Form.Dropdown
        id="importMethod"
        title="Import Method"
        value={importMethod}
        onChange={(newValue) => setImportMethod(newValue as "file" | "url")}
      >
        <Form.Dropdown.Item value="file" title="From File" />
        <Form.Dropdown.Item value="url" title="From URL" />
      </Form.Dropdown>

      {importMethod === "file" && (
        <Form.FilePicker
          id="filePath"
          title="Select File"
          allowMultipleSelection={false}
          canChooseDirectories={false}
        />
      )}

      {importMethod === "url" && (
        <Form.TextField
          id="url"
          title="URL Address"
          placeholder="https://example.com/prompts.json"
          error={urlError}
          onChange={() => setUrlError(undefined)}
        />
      )}
    </Form>
  );
}

// 主导入按钮组件
export function ImportPromptsAction({ onImport, currentPrompts }: ImportPromptsActionProps) {
  const { push } = useNavigation();

  const handleOpenImportForm = () => {
    push(<ImportForm onImport={onImport} currentPrompts={currentPrompts} />);
  };

  return (
    <Action
      title="Import Prompts"
      icon={Icon.Upload}
      onAction={handleOpenImportForm}
      shortcut={{ modifiers: ["cmd"], key: "i" }}
    />
  );
}
