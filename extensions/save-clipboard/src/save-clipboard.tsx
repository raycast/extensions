import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getPreferenceValues,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

type ClipboardType = "file" | "image" | "text" | "html" | "empty";

const IMAGE_SIGNATURES: [Buffer, string][] = [
  [Buffer.from([0xff, 0xd8, 0xff]), ".jpg"],
  [Buffer.from([0x89, 0x50, 0x4e, 0x47]), ".png"],
  [Buffer.from([0x47, 0x49, 0x46, 0x38]), ".gif"],
  [Buffer.from([0x42, 0x4d]), ".bmp"],
  [Buffer.from([0x49, 0x49, 0x2a, 0x00]), ".tiff"],
  [Buffer.from([0x4d, 0x4d, 0x00, 0x2a]), ".tiff"],
];

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif", ".webp"]);

function detectImageFormat(filePath: string): string | null {
  try {
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(12);
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);

    for (const [sig, ext] of IMAGE_SIGNATURES) {
      if (buf.subarray(0, sig.length).equals(sig)) return ext;
    }

    if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return ".webp";
  } catch {
    // unreadable
  }
  return null;
}

interface ClipboardState {
  type: ClipboardType;
  sourcePath?: string;
  text?: string;
  html?: string;
  suggestedFilename: string;
  extension: string;
}

function getDefaultDirectory(): string {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.defaultDirectory || path.join(os.homedir(), "Downloads");
}

function generateTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function toFilePath(raw: string): string {
  if (raw.startsWith("file://")) return fileURLToPath(raw);
  return raw;
}

async function detectClipboard(): Promise<ClipboardState> {
  const content = await Clipboard.read();

  if (content.file) {
    const fsPath = toFilePath(content.file);
    const basename = path.basename(fsPath);
    const ext = path.extname(basename);
    const base = path.basename(basename, ext);

    const isImage = IMAGE_EXTENSIONS.has(ext.toLowerCase()) || (!ext && detectImageFormat(fsPath));
    if (isImage) {
      return {
        type: "image",
        sourcePath: fsPath,
        suggestedFilename: ext ? base : `screenshot-${generateTimestamp()}`,
        extension: ".jpg",
      };
    }

    return {
      type: "file",
      sourcePath: fsPath,
      suggestedFilename: base,
      extension: ext,
    };
  }

  if (content.html) {
    return {
      type: "html",
      html: content.html,
      text: content.text,
      suggestedFilename: `clipboard-${generateTimestamp()}`,
      extension: ".html",
    };
  }

  if (content.text) {
    return {
      type: "text",
      text: content.text,
      suggestedFilename: `clipboard-${generateTimestamp()}`,
      extension: ".txt",
    };
  }

  return {
    type: "empty",
    suggestedFilename: "",
    extension: "",
  };
}

function convertToJpeg(sourcePath: string, destPath: string): void {
  if (process.platform === "darwin") {
    execFileSync("sips", ["--setProperty", "format", "jpeg", sourcePath, "--out", destPath], { stdio: "ignore" });
  } else {
    fs.copyFileSync(sourcePath, destPath);
  }
}

function resolveUniqueFilename(dir: string, name: string, ext: string): string {
  let candidate = path.join(dir, `${name}${ext}`);
  let counter = 1;

  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${name} (${counter})${ext}`);
    counter++;
  }

  return candidate;
}

export default function Command() {
  const [clipState, setClipState] = useState<ClipboardState | null>(null);
  const [filename, setFilename] = useState("");
  const [directory, setDirectory] = useState<string[]>([getDefaultDirectory()]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    detectClipboard()
      .then((state) => {
        if (state.type === "empty") {
          showToast({
            style: Toast.Style.Failure,
            title: "Clipboard is empty",
            message: "Copy a file or text first",
          });
          popToRoot();
          return;
        }
        setClipState(state);
        setFilename(state.suggestedFilename);
        setIsLoading(false);
      })
      .catch(async (error) => {
        console.error("Failed to read clipboard:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to read clipboard",
          message: error instanceof Error ? error.message : String(error),
        });
        popToRoot();
      });
  }, []);

  async function handleSubmit() {
    if (!clipState || clipState.type === "empty") return;

    const targetDir = directory[0] || getDefaultDirectory();
    const destPath = resolveUniqueFilename(
      targetDir,
      filename.trim() || clipState.suggestedFilename,
      clipState.extension,
    );

    try {
      if (clipState.type === "image" && clipState.sourcePath) {
        convertToJpeg(clipState.sourcePath, destPath);
      } else if (clipState.type === "file" && clipState.sourcePath) {
        fs.copyFileSync(clipState.sourcePath, destPath);
      } else if (clipState.type === "html" && clipState.html) {
        fs.writeFileSync(destPath, clipState.html, "utf-8");
      } else if (clipState.type === "text" && clipState.text) {
        fs.writeFileSync(destPath, clipState.text, "utf-8");
      }

      await showHUD(`Saved ${path.basename(destPath)}`);
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const typeLabel =
    clipState?.type === "image"
      ? "Image (JPG)"
      : clipState?.type === "file"
        ? `File (${clipState.extension.replace(".", "").toUpperCase()})`
        : clipState?.type === "html"
          ? "HTML content"
          : clipState?.type === "text"
            ? "Text content"
            : "Detecting...";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Clipboard Content" text={typeLabel} />
      <Form.TextField
        id="filename"
        title="Filename"
        placeholder="Enter filename"
        value={filename}
        onChange={setFilename}
      />
      <Form.FilePicker
        id="directory"
        title="Save To"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        value={directory}
        onChange={setDirectory}
      />
    </Form>
  );
}
