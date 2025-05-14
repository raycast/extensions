import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import fs from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { useState } from "react";

export default function Command() {
  const [textareaValue, setTextareaValue] = useState("");

  async function handleSubmit() {
    if (!textareaValue.trim()) {
      await showToast({
        title: "Error",
        message: "Text area cannot be empty.",
        style: Toast.Style.Failure,
      });
      return;
    }

    try {
      const id = randomUUID();
      const currentDate = new Date().toISOString();

      const tagRegex = /#([a-zA-Z0-9_]+)/g;
      const tags = Array.from(textareaValue.matchAll(tagRegex), (m) => m[1]);
      const tagsArrayString = `[${tags.join(", ")}]`;

      const bodyWithoutTags = textareaValue.replace(tagRegex, "").replace(/ {2,}/g, " ").trim();

      const fileContent = `---
id: ${id}
date: ${currentDate}
date modified: ${currentDate}
tags: ${tagsArrayString}
---

${bodyWithoutTags}`;

      const codexDir = path.join(os.homedir(), "ObsidianVaultsSync", "Codex");
      if (!fs.existsSync(codexDir)) {
        fs.mkdirSync(codexDir, { recursive: true });
      }

      const filePath = path.join(codexDir, `${id}.md`);

      fs.writeFileSync(filePath, fileContent);

      await showToast({
        title: "Success",
        message: `Codex entry created: ${id}.md`,
        style: Toast.Style.Success,
      });
      setTextareaValue("");
      // Optionally, close the Raycast window or pop to root
      // await closeMainWindow();
      // await popToRoot({ clearSearchBar: true });
    } catch (error: unknown) {
      console.error("Failed to create Codex entry:", error);
      let message = "See Raycast logs for details.";
      if (error instanceof Error) {
        message = error.message;
      }
      await showToast({
        title: "Error Creating File",
        message,
        style: Toast.Style.Failure,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter text into the text area below." />
      <Form.TextArea
        id="textarea"
        title="Enter your Folio"
        placeholder="Enter multi-line text"
        value={textareaValue}
        onChange={setTextareaValue}
      />
    </Form>
  );
}
