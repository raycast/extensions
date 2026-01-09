import { ActionPanel, Action, Form, showToast, Toast, Clipboard, Icon } from "@raycast/api";
import { useState } from "react";
import { writeFile, mkdir } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

export default function Command() {
  const [text, setText] = useState("");
  const [fileFormat, setFileFormat] = useState("txt");

  function getTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  }

  async function handleSubmit() {
    try {
      const saveDir = join(homedir(), "Downloads", "raycast-text");
      await mkdir(saveDir, { recursive: true });
      const fileName = `text-${getTimestamp()}.${fileFormat}`;
      const filePath = join(saveDir, fileName);

      await writeFile(filePath, text);
      await Clipboard.copy(filePath);

      await showToast({
        style: Toast.Style.Success,
        title: "Text saved successfully",
        message: `Saved to ${filePath}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save text",
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Text" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text=" 📝 Save Selected Text" />
      <Form.TextArea
        id="text"
        title="Text Content"
        placeholder="Paste or type text to save..."
        value={text}
        onChange={setText}
      />
      <Form.Separator />
      <Form.Dropdown id="format" title="File Format" value={fileFormat} onChange={setFileFormat}>
        <Form.Dropdown.Item value="txt" title="Text (.txt)" />
        <Form.Dropdown.Item value="log" title="Log (.log)" />
        <Form.Dropdown.Item value="md" title="Markdown (.md)" />
        <Form.Dropdown.Item value="json" title="JSON (.json)" />
        <Form.Dropdown.Item value="csv" title="CSV (.csv)" />
        <Form.Dropdown.Item value="xml" title="XML (.xml)" />
        <Form.Dropdown.Item value="html" title="HTML (.html)" />
        <Form.Dropdown.Item value="css" title="CSS (.css)" />
        <Form.Dropdown.Item value="js" title="JavaScript (.js)" />
        <Form.Dropdown.Item value="py" title="Python (.py)" />
      </Form.Dropdown>
      <Form.Description text={`Save Location\n\n\`~/Downloads/raycast-text/xxx.${fileFormat}\``} />
    </Form>
  );
}
