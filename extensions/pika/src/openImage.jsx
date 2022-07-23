import { Form, ActionPanel, Icon, Action, open, environment, showHUD } from "@raycast/api";
import { Action$ } from "raycast-toolkit";
import { useState } from "react";
import { readFileSync, existsSync } from "fs";
import fetch from "node-fetch";
const urlPrefix = environment.isDevelopment ? `http://localhost:3000` : `https://pika.style`;

const getImageUrl = async ({ file }) => {
  if (!existsSync(file)) {
    return { error: "File does not exist" };
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

  function handleSubmit() {
    setLoading(true);

    getImageUrl({ file })
      .then(async (res) => {
        if (!res.url) {
          await showHUD("Something went wrong, please try again");
        } else {
          await open(`${urlPrefix}/?use=${res?.url}&utm_source=Pika%20for%20Raycast(Image)`);
          await showHUD("Opening in pika.style...");
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
            onSelect={setFile}
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
