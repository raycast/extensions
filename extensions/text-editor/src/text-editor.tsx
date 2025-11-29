import { Form, ActionPanel, Action, showToast, LocalStorage, Icon, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs";
import os from "os";
import path from "path";

export default function Command() {
  const [title, setTitle] = useState("");
  const [contents, setContents] = useState("");
  const [showSaveAs, setShowSaveAs] = useState(false);

  // Load saved draft
  useEffect(() => {
    (async () => {
      const savedTitle = await LocalStorage.getItem<string>("text-editor-title");
      const savedContents = await LocalStorage.getItem<string>("text-editor-contents");
      if (savedTitle) setTitle(savedTitle);
      if (savedContents) setContents(savedContents);
    })();
  }, []);

  // Save in Raycast
  async function handleSave() {
    await LocalStorage.setItem("text-editor-title", title);
    await LocalStorage.setItem("text-editor-contents", contents);
    showToast({
      title: "Saved",
      message: "This will be here next time you open Text Editor",
    });
  }

  // Save As flow
  async function handleSaveAs(values: { filename: string; filetype: string; location: string }) {
    const home = os.homedir();
    const folder = values.location || "Documents";
    const filePath = path.join(home, folder, `${values.filename}.${values.filetype}`);

    try {
      fs.writeFileSync(filePath, contents, "utf-8");
      showToast({ title: "Saved As", message: `Saved to ${filePath}` });
      setShowSaveAs(false); // return to main form
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Save Failed",
        message: String(error),
      });
    }
  }

  // Render Save As form
  if (showSaveAs) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Save File" onSubmit={handleSaveAs} icon={Icon.SaveDocument} />
            <Action title="Back" onAction={() => setShowSaveAs(false)} icon={Icon.ArrowLeft} />
          </ActionPanel>
        }
      >
        <Form.TextField id="filename" title="File Name" defaultValue={title || "Text Editor"} />
        <Form.Dropdown id="filetype" title="File Type" defaultValue="txt">
          <Form.Dropdown.Item value="txt" title=".txt" />
          <Form.Dropdown.Item value="md" title=".md" />
          <Form.Dropdown.Item value="csv" title=".csv" />
        </Form.Dropdown>
        <Form.TextField
          id="location"
          title="Save Location"
          placeholder="Documents or Desktop"
          defaultValue="Documents"
        />
      </Form>
    );
  }

  // Render main Text Editor form
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={handleSave}
            shortcut={{ modifiers: ["ctrl"], key: "return" }}
            icon={Icon.SaveDocument}
          />
          <Action
            title="Save as…"
            onAction={() => setShowSaveAs(true)}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "return" }}
            icon={Icon.Folder}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Note name" value={title} onChange={setTitle} />
      <Form.TextArea
        id="contents"
        title="Contents"
        placeholder="Find your inner Shakespeare…"
        value={contents}
        onChange={setContents}
      />
    </Form>
  );
}
