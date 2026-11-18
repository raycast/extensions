import { Form, showToast, Toast, ActionPanel, Action, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import * as wip from "./oauth/wip";
import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Clipboard.read() only reports files and text, so a copied screenshot or bitmap has to be read from the pasteboard.
async function saveClipboardImage(): Promise<string | undefined> {
  const filePath = path.join(os.tmpdir(), `wip-clipboard-${Date.now()}.png`);
  const script = [
    "on run argv",
    "try",
    "set imageData to the clipboard as «class PNGf»",
    "on error",
    "set imageData to the clipboard as «class TIFF»",
    "end try",
    "set fileRef to open for access (POSIX file (item 1 of argv)) with write permission",
    "set eof fileRef to 0",
    "write imageData to fileRef",
    "close access fileRef",
    "end run",
  ];

  try {
    await execFileAsync("osascript", [...script.flatMap((line) => ["-e", line]), filePath]);
    await execFileAsync("sips", ["-s", "format", "png", filePath, "--out", filePath]);
    return filePath;
  } catch {
    return undefined;
  }
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [media, setMedia] = useState<string[]>([]);

  useEffect(() => {
    async function authorize() {
      try {
        await wip.authorize();
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        showToast({ style: Toast.Style.Failure, title: String(error) });
        setIsLoading(false);
      }
    }
    authorize();
  }, []);

  async function addFileFromClipboard() {
    const clipboardContent = await Clipboard.read();
    if (clipboardContent.file) {
      console.log("Clipboard file path:", clipboardContent.file);

      let filePath = decodeURIComponent(clipboardContent.file);
      if (filePath.startsWith("file://")) {
        filePath = filePath.replace("file://", "");
      }

      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          console.error("Error: File does not exist", filePath);
          showToast({ style: Toast.Style.Failure, title: "File does not exist", message: filePath });
        } else {
          setMedia((prevMedia) => [...prevMedia, filePath]);
          showToast({ style: Toast.Style.Success, title: "File added from clipboard!" });
        }
      });
    } else if (clipboardContent.text) {
      setSearchQuery((prevQuery) => prevQuery + clipboardContent.text);
    } else {
      const imagePath = await saveClipboardImage();
      if (imagePath) {
        setMedia((prevMedia) => [...prevMedia, imagePath]);
        showToast({ style: Toast.Style.Success, title: "Image added from clipboard!" });
      } else {
        showToast({ style: Toast.Style.Failure, title: "No file, image or text found in clipboard!" });
      }
    }
  }

  async function createNewTodo() {
    if (!searchQuery.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Cannot create an empty todo." });
      return;
    }
    try {
      setIsLoading(true);
      await wip.createTodo(searchQuery, media);
      setSearchQuery("");
      setMedia([]);
      setIsLoading(false);
      showToast({ style: Toast.Style.Success, title: "Todo created successfully!" });
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      showToast({ style: Toast.Style.Failure, title: String(error) });
    }
  }

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={createNewTodo} />
          <Action
            title="Add File from Clipboard"
            onAction={addFileFromClipboard}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="todoInput"
        placeholder="What did you do?"
        autoFocus={true}
        value={searchQuery}
        onChange={setSearchQuery}
      />

      <Form.FilePicker id="media" title="" value={media} onChange={setMedia} allowMultipleSelection={true} />
    </Form>
  );
}
