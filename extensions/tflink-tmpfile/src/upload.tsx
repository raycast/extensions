import { Action, ActionPanel, Clipboard, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import fs from "fs/promises";
import path from "path";
import QRCode from "qrcode";

const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;

const sanitizeFileName = (name: string): string => {
  return name
    .replace(/[×x]/g, "x")
    .replace(/[()[\]{}]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
};

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Initializing...");
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const startTimer = () => {
    setElapsedTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const retryUpload = () => {
    uploadControllerRef.current?.abort();
    const controller = new AbortController();
    uploadControllerRef.current = controller;
    void uploadFromClipboard(controller.signal);
  };

  const uploadFromClipboard = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    setDownloadLink(null);
    setElapsedTime(0);
    startTimer();

    try {
      setStatusText("Checking clipboard...");
      if (signal?.aborted) return;

      const clipboardContents = await Clipboard.read();
      if (signal?.aborted) return;

      const formData = new FormData();
      let name = "";
      let sizeDisplay = "";

      if (clipboardContents.file) {
        let filePath: string;

        try {
          filePath = decodeURIComponent(new URL(clipboardContents.file).pathname);
        } catch {
          filePath = clipboardContents.file;
        }

        try {
          await fs.access(filePath);
        } catch {
          throw new Error("The clipboard file no longer exists.");
        }

        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) throw new Error("Directory upload not supported. Please zip it first.");
        if (stats.size > MAX_UPLOAD_SIZE_BYTES) throw new Error("File exceeds 100MB limit.");

        const originalName = path.basename(filePath);
        let finalName = originalName;
        const fileBuffer = await fs.readFile(filePath);
        const ext = path.extname(originalName);
        const isTempImage = !ext || (originalName.startsWith("Image") && originalName.includes("("));

        if (isTempImage && fileBuffer.length > 4) {
          if (fileBuffer[0] === 0x89 && fileBuffer[1] === 0x50 && fileBuffer[2] === 0x4e && fileBuffer[3] === 0x47) {
            if (!finalName.toLowerCase().endsWith(".png")) finalName += ".png";
          } else if (fileBuffer[0] === 0xff && fileBuffer[1] === 0xd8 && fileBuffer[2] === 0xff) {
            if (!finalName.toLowerCase().endsWith(".jpg") && !finalName.toLowerCase().endsWith(".jpeg")) {
              finalName += ".jpg";
            }
          } else if (!ext) {
            finalName += ".png";
          }
        }

        name = sanitizeFileName(finalName) || "file";

        setFileName(name);
        sizeDisplay = formatBytes(stats.size);
        setFileSize(sizeDisplay);
        setStatusText(`Uploading "${name}"...`);

        formData.append("file", new Blob([new Uint8Array(fileBuffer)]), name);
      } else if (clipboardContents.text && clipboardContents.text.trim() !== "") {
        name = `snippet_${new Date().getTime()}.txt`;
        setFileName(name);
        const size = new Blob([clipboardContents.text]).size;
        sizeDisplay = formatBytes(size);
        setFileSize(sizeDisplay);

        setStatusText("Uploading text snippet...");
        formData.append("file", new Blob([clipboardContents.text], { type: "text/plain" }), name);
      } else {
        throw new Error("Clipboard is empty or does not contain text/files.");
      }

      const response = await fetch("https://tmpfile.link/api/upload", {
        method: "POST",
        body: formData,
        signal,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Upload failed (${response.status}): ${err || "Unknown error"}`);
      }

      const result = (await response.json()) as {
        downloadLink: string;
        downloadLinkEncoded?: string;
      };

      if (signal?.aborted) return;

      const finalLink = result.downloadLinkEncoded || result.downloadLink;

      setDownloadLink(finalLink);
      await Clipboard.copy(finalLink);

      try {
        const qrDataUrl = await QRCode.toDataURL(finalLink, {
          width: 180,
          margin: 1,
        });
        setQrCodeData(qrDataUrl);
      } catch (e) {
        console.error("QR Code generation failed:", e);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Uploaded & Copied!",
      });
      setStatusText("Successfully Uploaded!");
    } catch (err) {
      if (signal?.aborted || (err instanceof Error && err.name === "AbortError")) {
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatusText("Failed");
      await showToast({
        style: Toast.Style.Failure,
        title: "Upload Failed",
        message: msg,
      });
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
        stopTimer();
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    uploadControllerRef.current = controller;
    uploadFromClipboard(controller.signal);

    return () => {
      controller.abort();
      uploadControllerRef.current = null;
      stopTimer();
    };
  }, [uploadFromClipboard]);

  const getMarkdown = () => {
    if (error) {
      return `
# ❌ Upload Failed

**Error:** ${error}

Please check your network and try again.
            `;
    }

    if (isLoading) {
      return `
# ⏳ Uploading...

**Status:** ${statusText}

Please wait while we send your data to the cloud.
            `;
    }

    // Generate QR code locally
    const qrCodeState = downloadLink ? `![QR Code](${qrCodeData})\n` : "";

    return `
# ✅ Upload Complete!

> The link has been copied to your clipboard.

[**🔗 Open in Browser**](${downloadLink})

---
${qrCodeState}
        `;
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={getMarkdown()}
      navigationTitle="tfLink tmpfile.link Upload"
      metadata={
        downloadLink ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Status"
              text="Success"
              icon={{ source: Icon.CheckCircle, tintColor: "#2ecc71" }}
            />
            <Detail.Metadata.Label title="File Name" text={fileName || "-"} />
            <Detail.Metadata.Label title="File Size" text={fileSize || "-"} />
            <Detail.Metadata.Label title="Time Elapsed" text={`${elapsedTime}s`} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="QR Code" text="Visible in Main View" />
            <Detail.Metadata.TagList title="Retention">
              <Detail.Metadata.TagList.Item text="7 Days" color={"#eed535"} />
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        ) : (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Status"
              text="Uploading"
              icon={{ source: Icon.CircleProgress, tintColor: "#3498db" }}
            />
            <Detail.Metadata.Label title="Time Elapsed" text={`${elapsedTime}s`} />
            {fileName && <Detail.Metadata.Label title="File Name" text={fileName} />}
            {fileSize && <Detail.Metadata.Label title="File Size" text={fileSize} />}
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {!isLoading && downloadLink && (
            <>
              <Action.CopyToClipboard title="Copy Link" content={downloadLink} />
              <Action.OpenInBrowser title="Open in Browser" url={downloadLink} />
            </>
          )}
          {!isLoading && error && (
            <Action title="Retry" onAction={retryUpload} shortcut={{ modifiers: ["cmd"], key: "r" }} />
          )}
        </ActionPanel>
      }
    />
  );
}
