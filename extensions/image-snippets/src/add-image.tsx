import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  Detail,
  Icon,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { existsSync, unlinkSync, copyFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import {
  getImagesFolder,
  ensureFolderExists,
  addSnippet,
  generateId,
  generateFileName,
} from "./utils";
import { ImageSnippet } from "./types";

function getClipboardImage(): string | null {
  try {
    const checkScript = `
      try
        set theData to the clipboard as «class PNGf»
        return "png"
      on error
        try
          set theData to the clipboard as TIFF picture
          return "tiff"
        on error
          return "none"
        end try
      end try
    `;

    const result = execSync(`osascript -e '${checkScript}'`).toString().trim();

    if (result === "none") {
      return null;
    }

    const tempPath = `/tmp/raycast-snippet-preview-${Date.now()}.png`;
    const extractScript = `
      set theFile to POSIX file "${tempPath}"
      try
        set theData to the clipboard as «class PNGf»
        set fileRef to open for access theFile with write permission
        write theData to fileRef
        close access fileRef
        return "success"
      on error errMsg
        try
          close access theFile
        end try
        return "error"
      end try
    `;

    const extractResult = execSync(`osascript -e '${extractScript}'`)
      .toString()
      .trim();

    if (extractResult !== "success") {
      return null;
    }

    return tempPath;
  } catch {
    return null;
  }
}

export default function AddImage() {
  const [tempPath, setTempPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");

  function loadClipboardImage() {
    setLoading(true);
    setError(null);

    const path = getClipboardImage();

    if (!path) {
      setError("No image found in clipboard");
      setLoading(false);
      return;
    }

    setTempPath(path);
    setLoading(false);
  }

  useEffect(() => {
    loadClipboardImage();

    return () => {
      if (tempPath && existsSync(tempPath)) {
        try {
          unlinkSync(tempPath);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  async function handleSubmit() {
    if (!tempPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No image to save",
      });
      return;
    }

    if (!name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a name",
      });
      return;
    }

    ensureFolderExists();
    const folder = getImagesFolder();
    const fileName = generateFileName();
    const filePath = join(folder, fileName);

    try {
      copyFileSync(tempPath, filePath);

      const snippet: ImageSnippet = {
        id: generateId(),
        fileName,
        name: name.trim(),
        keywords: keywords
          .split(",")
          .map((k) => k.trim().toLowerCase())
          .filter((k) => k.length > 0),
        pinned: false,
        createdAt: new Date().toISOString(),
      };

      addSnippet(snippet);

      // cleanup temp file
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }

      await showToast({
        style: Toast.Style.Success,
        title: `🤠 Saved "${name}"!`,
      });

      popToRoot(); // ferme proprement
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save image",
        message: String(error),
      });
    }
  }

  if (loading) {
    return <Detail isLoading={true} markdown="Checking clipboard..." />;
  }

  if (error || !tempPath) {
    return (
      <Detail
        markdown={`# ⚠️ ${error || "No image found"}

Copy an image to your clipboard first, then try again.

**Supported sources:**
- Screenshots (Cmd+Shift+4)
- Images from web browsers
- Images from other apps
`}
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={loadClipboardImage}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Snippet"
            icon={Icon.Download}
            onSubmit={handleSubmit}
          />
          <Action
            title="Refresh Clipboard"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={loadClipboardImage}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="📋 Last copied image"
        text={`Ready to save: ${tempPath}`}
      />
      <Form.Separator />
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My awesome image"
        value={name}
        onChange={setName}
        autoFocus
      />
      <Form.TextField
        id="keywords"
        title="Keywords"
        placeholder="logo, brand, signature"
        value={keywords}
        onChange={setKeywords}
        info="Comma-separated keywords for quick search"
      />
    </Form>
  );
}
