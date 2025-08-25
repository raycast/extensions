import { Action, ActionPanel, Form, showToast, Toast, popToRoot, Icon, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { readdirSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { exec } from "child_process";

function resolveNotesDir(): string {
  const { notesDir } = getPreferenceValues<{ notesDir: string }>();
  return notesDir.startsWith("~") ? join(homedir(), notesDir.slice(1)) : notesDir;
}

function resolveNoteApp(): string {
  type AppPickerValue = string | { name?: string; path?: string };
  const { appPath } = getPreferenceValues<{ appPath: AppPickerValue }>();
  if (typeof appPath === "string") {
    return appPath;
  }
  if (appPath && typeof appPath === "object") {
    return appPath.name || appPath.path || "Typora";
  }
  return "Typora";
}

export default function CreateNoteCommand() {
  const [templates, setTemplates] = useState<string[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    const baseDir = resolveNotesDir();
    const templateDir = join(baseDir, ".note-templates");

    if (!existsSync(templateDir)) {
      mkdirSync(templateDir, { recursive: true });
    }

    const files = readdirSync(templateDir).filter((f) => f.endsWith(".md"));
    setTemplates(files);
    setLoadingTemplates(false);
  }, []);

  async function handleSubmit(values: { title: string; template?: string; useIndex: boolean }) {
    const folderName = values.title.trim();
    if (!folderName) {
      await showToast({ style: Toast.Style.Failure, title: "Title cannot be empty" });
      return;
    }

    const baseDir = resolveNotesDir();
    const folderPath = join(baseDir, folderName);
    const fileName = values.useIndex ? "index.md" : `${folderName}.md`;
    const filePath = join(folderPath, fileName);

    if (!existsSync(folderPath)) {
      mkdirSync(folderPath, { recursive: true });
    }

    let content = `# ${folderName}\n\n`;

    if (values.template) {
      const templatePath = join(baseDir, ".note-templates", values.template);
      if (existsSync(templatePath)) {
        content = readFileSync(templatePath, "utf-8");
      }
    }

    writeFileSync(filePath, content);

    const noteApp = resolveNoteApp();
    const openCmd = `open -a "${noteApp}" "${filePath}"`;
    exec(openCmd, (err) => {
      if (err) {
        showToast({ style: Toast.Style.Failure, title: "Failed to open the app", message: err.message });
      }
    });

    await showToast({ style: Toast.Style.Success, title: `Created note: ${folderName}` });
    popToRoot();
  }

  return (
    <Form
      isLoading={loadingTemplates}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Note" onSubmit={handleSubmit} icon={Icon.Document} />
          <Action
            title="Open Template Directory in Finder"
            onAction={() => exec(`open "${join(resolveNotesDir(), ".note-templates")}"`)}
            icon={Icon.Finder}
          />
          <Action.CopyToClipboard
            title="Copy Template Directory Path"
            content={join(resolveNotesDir(), ".note-templates")}
          />
        </ActionPanel>
      }
      searchBarAccessory={
        <Form.LinkAccessory target="https://github.com/mynameisny/typora-note-creator" text="Open Documentation" />
      }
    >
      <Form.TextField id="title" title="Title" autoFocus placeholder="e.g. Study Plan 2025" />
      <Form.Checkbox id="useIndex" label="Use index.md as the filename" storeValue defaultValue={false} />
      <Form.Dropdown
        id="template"
        title="Template"
        storeValue
        info="You can open the template directory from the Action Panel below."
      >
        <Form.Dropdown.Item value="" title="(None)" icon={Icon.CircleDisabled} />
        {templates.map((t) => (
          <Form.Dropdown.Item key={t} value={t} title={t.replace(/\.md$/, "")} icon={{ fileIcon: __filename }} />
        ))}
      </Form.Dropdown>
      <Form.Description
        text={`The template directory is located at ".note-templates" under your notes root directory (${join(
          resolveNotesDir(),
          ".note-templates",
        )}). This location is fixed and cannot be changed.`}
      />
    </Form>
  );
}
