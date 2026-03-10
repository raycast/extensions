import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import fs from "fs/promises";
import path from "path";
import { useEffect, useRef, useState } from "react";

type SkillEntryFormProps = {
  skillPath: string;
  mode?: "create" | "edit";
  entryPath?: string;
  onSaved?: () => void | Promise<void>;
};

type EntryType = "file" | "folder";

type FormValues = {
  entryType: EntryType;
  entryPath: string;
  content?: string;
};

function resolveEntryPath(skillPath: string, entryPath: string): string {
  const resolved = path.resolve(skillPath, entryPath);
  if (!resolved.startsWith(path.resolve(skillPath) + path.sep)) {
    throw new Error("Entry path must stay within the skill folder.");
  }
  return resolved;
}

export default function SkillEntryForm({ skillPath, mode = "create", entryPath, onSaved }: SkillEntryFormProps) {
  const { pop } = useNavigation();
  const [contentValue, setContentValue] = useState("");
  const [entryPathValue, setEntryPathValue] = useState(entryPath ?? "");
  const [entryType, setEntryType] = useState<EntryType>("file");
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isBinary, setIsBinary] = useState(false);
  const originalEntryPath = useRef(entryPath ?? "");
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (mode !== "edit") {
      return;
    }
    if (hasLoaded.current) {
      return;
    }

    const loadContent = async () => {
      if (!originalEntryPath.current) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Missing entry path",
        });
        setIsLoading(false);
        return;
      }

      try {
        const resolved = resolveEntryPath(skillPath, originalEntryPath.current);
        const stat = await fs.stat(resolved);
        if (stat.isDirectory()) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Folders cannot be edited",
          });
          setIsBinary(true);
          setIsLoading(false);
          return;
        }
        const buffer = await fs.readFile(resolved);
        if (buffer.includes(0)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Binary files cannot be edited",
          });
          setIsBinary(true);
          setIsLoading(false);
          return;
        }
        setContentValue(buffer.toString("utf8"));
        setEntryPathValue(originalEntryPath.current);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load file",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
        hasLoaded.current = true;
      }
    };

    void loadContent();
  }, [mode, skillPath]);

  async function handleSubmit(values: FormValues) {
    if (mode === "edit") {
      if (!originalEntryPath.current) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Entry path is required",
        });
        return;
      }
      if (isBinary) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Binary files cannot be edited",
        });
        return;
      }
      const trimmedPath = values.entryPath.trim();
      if (!trimmedPath) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Entry path is required",
        });
        return;
      }
      if (path.isAbsolute(trimmedPath) || trimmedPath.includes("..")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Entry path must be relative and not contain ..",
        });
        return;
      }
      try {
        const resolved = resolveEntryPath(skillPath, originalEntryPath.current);
        const nextResolved = resolveEntryPath(skillPath, trimmedPath);
        if (resolved !== nextResolved) {
          try {
            const existing = await fs.stat(nextResolved);
            if (existing.isDirectory()) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Target path is a folder",
              });
            } else {
              await showToast({
                style: Toast.Style.Failure,
                title: "A file already exists at the target path",
              });
            }
            return;
          } catch {
            await fs.mkdir(path.dirname(nextResolved), { recursive: true });
          }
          await fs.rename(resolved, nextResolved);
        }
        await fs.writeFile(nextResolved, values.content ?? "", "utf8");
        await showToast({
          style: Toast.Style.Success,
          title: `Updated ${trimmedPath}`,
        });
        if (onSaved) {
          await onSaved();
        }
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to update file",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
      return;
    }

    const trimmedPath = values.entryPath.trim();
    if (!trimmedPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Entry path is required",
      });
      return;
    }
    if (path.isAbsolute(trimmedPath) || trimmedPath.includes("..")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Entry path must be relative and not contain ..",
      });
      return;
    }

    let targetPath: string;
    try {
      targetPath = resolveEntryPath(skillPath, trimmedPath);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid entry path",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return;
    }

    try {
      if (values.entryType === "folder") {
        await fs.mkdir(targetPath, { recursive: true });
        await showToast({
          style: Toast.Style.Success,
          title: "Folder created",
        });
      } else {
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        const content = values.content ?? "";
        await fs.writeFile(targetPath, content, "utf8");
        await showToast({ style: Toast.Style.Success, title: "File created" });
      }

      if (onSaved) {
        await onSaved();
      }
      if (mode === "create") {
        pop();
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create entry",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      navigationTitle={mode === "edit" ? "Edit File" : "Add File or Folder"}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={mode === "edit" ? "Save" : "Create"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {mode === "edit" ? (
        <>
          {!isLoading && (
            <>
              <Form.TextField
                id="entryPath"
                title="Path"
                value={entryPathValue}
                onChange={setEntryPathValue}
                placeholder="scripts/setup.sh"
              />
              <Form.TextArea
                id="content"
                title="Content"
                value={contentValue}
                onChange={setContentValue}
                placeholder="Edit file content"
              />
            </>
          )}
        </>
      ) : (
        <>
          <Form.Dropdown
            id="entryType"
            title="Type"
            value={entryType}
            onChange={(value) => setEntryType(value as EntryType)}
          >
            <Form.Dropdown.Item value="file" title="File" />
            <Form.Dropdown.Item value="folder" title="Folder" />
          </Form.Dropdown>
          <Form.TextField id="entryPath" title="Relative Path" placeholder="scripts/setup.sh" />
          {entryType === "file" ? (
            <Form.TextArea id="content" title="Content" placeholder="Optional file content" />
          ) : null}
        </>
      )}
    </Form>
  );
}
