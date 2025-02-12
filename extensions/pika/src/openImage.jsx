import { Form, ActionPanel, Icon, Action, showToast, open, Toast, environment, showHUD } from "@raycast/api";
import { Action$ } from "raycast-toolkit";
import { useState } from "react";
import { readFileSync, existsSync, statSync } from "fs";
import fetch from "node-fetch";
const urlPrefix = environment.isDevelopment ? `http://localhost:3000` : `https://pika.style`;

const getImageUrl = async ({ file }) => {
  if (!existsSync(file)) {
    await showToast({ title: "File does not exist", style: Toast.Style.Failure });
    return { error: "File does not exist" };
  }
  const fileInfo = statSync(file);
  const fileSizeInMb = fileInfo.size / (1024 * 1024);

  if (fileSizeInMb > 3.9) {
    await showToast({ title: "File size cannot be more than 4MBs", style: Toast.Style.Failure });
    return { error: "File size cannot be more than 4MBs" };
  }

  const contents = readFileSync(file, { encoding: "base64" });
  const result = await fetch(`${urlPrefix}/api/addPublicImage`, {
    method: "POST",
    body: JSON.stringify({
      baseData: contents,
      source: "raycast",
    }),
  }).then((res) => res.json());

  return result;
};

export default function Command() {
  const [isLoading, setLoading] = useState(false);
  const [file, setFile] = useState("");

  async function handleSubmit() {
    setLoading(true);

    getImageUrl({ file })
      .then(async (res) => {
        if (res.url) {
          await open(`${urlPrefix}/?use=${res?.url}&utm_source=Pika%20for%20Raycast(Image)`);
          await showHUD("Opening in pika.style...");
          return;
        }

        if (res.error) {
          await showToast({ title: res.error, style: Toast.Style.Failure });
        } else {
          await showToast({ title: "Something went wrong, please try again", style: Toast.Style.Failure });
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <Form
      navigationTitle={isLoading ? "🤖 Processing your image..." : "pika.style"}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open in Pika" onSubmit={handleSubmit} />
          <Action$.SelectFile
            icon={Icon.Finder}
            title="Select Image From Finder..."
            prompt="Please select an image"
            type="public.image"
            shortcut={{ key: "o", modifiers: ["cmd"] }}
            onSelect={(path) => {
              if (path) {
                setFile(path);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="file"
        title="Select image"
        value={file}
        onChange={setFile}
        placeholder="Enter the file path, or press ⌘+O to pick file"
      />
      <Form.Description
        title="Note"
        text="File size cannot exceed 4MB, your file will be temporarily stored on a server"
      />
    </Form>
  );
}
