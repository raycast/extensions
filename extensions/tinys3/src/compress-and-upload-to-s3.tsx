import { Detail, ActionPanel, Action, Clipboard, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import React, { useEffect, useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { readClipboardImageFile, getContentType } from "./lib/clipboard";
import { compressWithTinyPng } from "./lib/tinypng";
import { uploadToS3 } from "./lib/s3";
import { buildPublicUrl, formatUrl, UrlFormat } from "./lib/format";
import { prettyBytes, savingsPercent } from "./lib/bytes";

interface Preferences {
  s3Endpoint: string;
  s3Region: string;
  s3Bucket: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3KeyPrefix: string;
  s3PathStyle: "path" | "virtual";
  useCustomPublicUrl: boolean;
  publicUrlBase?: string;
  urlFormat: UrlFormat;
  tinypngApiKey: string;
}

type State =
  | { status: "initial" }
  | { status: "no-input" }
  | { status: "no-apikey" }
  | { status: "compressing"; filename: string; originalSize: number }
  | {
      status: "uploading";
      filename: string;
      originalSize: number;
      compressedSize: number;
      compressionCount?: string | null;
    }
  | {
      status: "success";
      url: string;
      formattedUrl: string;
      filename: string;
      originalSize: number;
      compressedSize: number;
      compressionCount?: string | null;
      key: string;
    }
  | { status: "error"; message: string };

export default function CompressAndUploadToS3() {
  const [state, setState] = useState<State>({ status: "initial" });
  const preferences = getPreferenceValues<Preferences>();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function compressAndUpload() {
      try {
        // Step 0: Check TinyPNG API key
        if (!preferences.tinypngApiKey) {
          setState({ status: "no-apikey" });
          return;
        }

        // Step 1: Read clipboard
        const image = await readClipboardImageFile();
        if (!image) {
          setState({ status: "no-input" });
          return;
        }

        const originalSize = image.data.length;
        setState({
          status: "compressing",
          filename: image.filename,
          originalSize,
        });

        // Step 2: Compress with TinyPNG
        const compressed = await compressWithTinyPng(image.data, preferences.tinypngApiKey);

        // Step 3: Generate key
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const uuid = uuidv4().slice(0, 8);
        const key = `${preferences.s3KeyPrefix || ""}${timestamp}-${uuid}.${image.extension}`;

        setState({
          status: "uploading",
          filename: image.filename,
          originalSize,
          compressedSize: compressed.afterBytes,
          compressionCount: compressed.compressionCount,
        });

        // Step 4: Upload to S3
        await uploadToS3({
          s3: {
            endpoint: preferences.s3Endpoint,
            region: preferences.s3Region,
            bucket: preferences.s3Bucket,
            accessKeyId: preferences.s3AccessKeyId,
            secretAccessKey: preferences.s3SecretAccessKey,
            forcePathStyle: preferences.s3PathStyle === "path",
          },
          key,
          body: compressed.output,
          contentType: getContentType(image.extension),
        });

        // Step 5: Generate URL
        const url = buildPublicUrl({
          useCustomPublicUrl: preferences.useCustomPublicUrl,
          publicUrlBase: preferences.publicUrlBase,
          s3Endpoint: preferences.s3Endpoint,
          s3Bucket: preferences.s3Bucket,
          s3PathStyle: preferences.s3PathStyle,
          key,
        });
        const formattedUrl = formatUrl(url, preferences.urlFormat);

        // Step 6: Copy to clipboard
        await Clipboard.copy(formattedUrl);

        setState({
          status: "success",
          url,
          formattedUrl,
          filename: image.filename,
          originalSize,
          compressedSize: compressed.afterBytes,
          compressionCount: compressed.compressionCount,
          key,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setState({ status: "error", message });
      }
    }

    compressAndUpload();
  }, []);

  const markdown = getMarkdown(state, preferences);
  const metadata = getMetadata(state);

  return (
    <Detail
      isLoading={state.status === "initial" || state.status === "compressing" || state.status === "uploading"}
      markdown={markdown}
      metadata={metadata}
      actions={
        <ActionPanel>
          {state.status === "success" && (
            <>
              <Action.CopyToClipboard
                title="Copy URL"
                content={state.url}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Markdown"
                content={`![](${state.url})`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              />
              <Action.CopyToClipboard
                title="Copy BBCode"
                content={`[img]${state.url}[/img]`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
              />
              <Action.OpenInBrowser
                title="Open in Browser"
                url={state.url}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </>
          )}
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function getMarkdown(state: State, preferences: Preferences): string {
  switch (state.status) {
    case "initial":
      return "## 📋 Reading clipboard...";
    case "no-input":
      return `## ❌ No Image Found

No image found in clipboard.

Please copy an image or image file first, then run this command again.

**Tips:**
- Take a screenshot (⌘ + Shift + 4)
- Copy an image file from Finder
- Copy an image from a web page`;
    case "no-apikey":
      return `## ⚠️ TinyPNG API Key Required

Please configure your TinyPNG API key in extension preferences.

You can get a free API key at [tinypng.com/developers](https://tinypng.com/developers)`;
    case "compressing":
      return `## 🗜️ Compressing...

Compressing **${state.filename}** with TinyPNG...

Original size: **${prettyBytes(state.originalSize)}**`;
    case "uploading":
      return `## ⬆️ Uploading...

Uploading compressed image to S3...

| Before | After | Saved |
|--------|-------|-------|
| ${prettyBytes(state.originalSize)} | ${prettyBytes(state.compressedSize)} | **${savingsPercent(state.originalSize, state.compressedSize)}** |`;
    case "success":
      return `## ✅ Upload Complete

![Uploaded Image](${state.url})

**URL copied to clipboard!** (${preferences.urlFormat} format)

| Before | After | Saved |
|--------|-------|-------|
| ${prettyBytes(state.originalSize)} | ${prettyBytes(state.compressedSize)} | **${savingsPercent(state.originalSize, state.compressedSize)}** |`;
    case "error":
      return `## ❌ Operation Failed

${state.message}

Please check your configuration in extension preferences.`;
  }
}

function getMetadata(state: State): React.ReactNode {
  if (state.status !== "success") return null;

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="File" text={state.filename} />
      <Detail.Metadata.Label title="Original Size" text={prettyBytes(state.originalSize)} />
      <Detail.Metadata.Label title="Compressed Size" text={prettyBytes(state.compressedSize)} />
      <Detail.Metadata.Label title="Saved" text={savingsPercent(state.originalSize, state.compressedSize)} />
      {state.compressionCount && <Detail.Metadata.Label title="TinyPNG Count" text={state.compressionCount} />}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Key" text={state.key} />
      <Detail.Metadata.Link title="URL" target={state.url} text="Open" />
    </Detail.Metadata>
  );
}
