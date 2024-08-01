import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { exec } from "child_process";

export default function Command() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [starred, setStarred] = useState(false);
  const { pop } = useNavigation();

  const handleSubmit = async () => {
    if (!url) {
      showToast(Toast.Style.Failure, "Error", "URL is required");
      return;
    }

    try {
      const script = `
        tell application "GoodLinks"
          set newLink to make new link with properties {url:"${url}", title:"${title}", tag names:${tags.split(",").map((tag) => `"${tag.trim()}"`)}, starred:${starred}}
        end tell
      `;
      await runAppleScript(script);
      showToast(Toast.Style.Success, "Link added successfully!");
      pop();
    } catch (error) {
      console.error("Failed to add link:", error);
      showToast(Toast.Style.Failure, "Failed to add link");
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Add Link" onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="Enter URL" value={url} onChange={setUrl} />
      <Form.TextField id="title" title="Title" placeholder="Enter title" value={title} onChange={setTitle} />
      <Form.TextField id="tags" title="Tags" placeholder="Comma-separated tags" value={tags} onChange={setTags} />
      <Form.Checkbox id="starred" label="Starred" value={starred} onChange={setStarred} />
    </Form>
  );
}

// Function to run AppleScript commands
async function runAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`osascript -e '${script}'`, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}
