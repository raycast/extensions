import { Clipboard, showHUD, Form, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [title, setTitle] = useState<string>("");
  const [tags, setTags] = useState<string>("");

  async function addLink() {
    try {
      const clipboardText = await Clipboard.readText();
      if (clipboardText) {
        const appleScript = `
          tell application "GoodLinks"
            set newLink to make new link with properties {url:"${clipboardText}", title:"${title || ''}"${tags ? `, tag names:${JSON.stringify(tags.split(",").map(tag => tag.trim()))}` : ''}}
          end tell
        `;
        await runAppleScript(appleScript);
        await showHUD("Link added to GoodLinks");
      } else {
        await showHUD("No URL found in clipboard");
      }
    } catch (error) {
      console.error("Failed to add link to GoodLinks:", error);
      await showHUD("Failed to add link to GoodLinks");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Add Link" onAction={addLink} />
        </ActionPanel>
      }
    >
      <Form.Description title="Title" text="Enter the title of the link (optional)" />
      <Form.TextField id="title" title="Title" value={title} onChange={setTitle} />

      <Form.Description title="Tags" text="Enter tags separated by commas (optional)" />
      <Form.TextField id="tags" title="Tags" value={tags} onChange={setTags} />
    </Form>
  );
}

function runAppleScript(script: string) {
  return new Promise((resolve, reject) => {
    const { exec } = require("child_process");
    exec(`osascript -e '${script}'`, (error: Error, stdout: string, stderr: string) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}
