import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  open,
  showToast,
  showInFinder,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useMemo, useState } from "react";
import { downloadResultFile } from "./result-files";

type Props = {
  copiedKind: "file" | "json";
  endpointId: string;
  outputFilePath?: string;
  outputUrl?: string;
  responseJson: string;
};

const IMAGE_EXTENSION_REGEX =
  /\.(png|jpe?g|webp|gif|bmp|tiff?|heic|heif|avif)(\?|$)/i;
const VIDEO_EXTENSION_REGEX = /\.(mp4|mov|webm|m4v)(\?|$)/i;
const MAX_RESPONSE_LENGTH = 20000;

function isImageUrl(value: string) {
  return IMAGE_EXTENSION_REGEX.test(value);
}

function isVideoUrl(value: string) {
  return VIDEO_EXTENSION_REGEX.test(value);
}

function toMarkdownFileUrl(filePath: string) {
  return `file://${encodeURI(filePath)}`;
}

function truncateResponseJson(responseJson: string) {
  if (responseJson.length <= MAX_RESPONSE_LENGTH) {
    return responseJson;
  }
  return `${responseJson.slice(0, MAX_RESPONSE_LENGTH)}\n... truncated ...`;
}

export function RequestFinishedDetail(props: Props) {
  const { pop } = useNavigation();
  const [outputFilePath, setOutputFilePath] = useState(props.outputFilePath);
  const [isPreparingOutputFile, setIsPreparingOutputFile] = useState(false);

  async function ensureOutputFilePath() {
    if (outputFilePath) {
      return outputFilePath;
    }
    if (!props.outputUrl) {
      throw new Error("No output file URL was found in this response");
    }

    setIsPreparingOutputFile(true);
    try {
      const downloadedFilePath = await downloadResultFile(props.outputUrl);
      setOutputFilePath(downloadedFilePath);
      return downloadedFilePath;
    } finally {
      setIsPreparingOutputFile(false);
    }
  }

  async function copyOutputFile() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Preparing output file...",
    });

    try {
      const localFilePath = await ensureOutputFilePath();
      await Clipboard.copy({ file: localFilePath });
      toast.style = Toast.Style.Success;
      toast.title = "Output file copied to clipboard";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not copy output file";
      toast.message = error instanceof Error ? error.message : String(error);
      await showFailureToast(error, { title: "Output file copy failed" });
    }
  }

  async function copyJsonResponse() {
    try {
      await Clipboard.copy(props.responseJson);
      await showToast({
        style: Toast.Style.Success,
        title: "JSON response copied",
      });
    } catch (error) {
      await showFailureToast(error, { title: "JSON copy failed" });
    }
  }

  async function copyOutputUrl() {
    if (!props.outputUrl) {
      return;
    }
    try {
      await Clipboard.copy(props.outputUrl);
      await showToast({
        style: Toast.Style.Success,
        title: "Output URL copied",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Output URL copy failed" });
    }
  }

  async function openOutputInBrowser() {
    if (!props.outputUrl) {
      return;
    }
    try {
      await open(props.outputUrl);
    } catch (error) {
      await showFailureToast(error, { title: "Open in browser failed" });
    }
  }

  async function openOutputFile() {
    try {
      const localFilePath = await ensureOutputFilePath();
      await open(localFilePath);
    } catch (error) {
      await showFailureToast(error, { title: "Open output file failed" });
    }
  }

  async function revealOutputInFinder() {
    try {
      const localFilePath = await ensureOutputFilePath();
      await showInFinder(localFilePath);
    } catch (error) {
      await showFailureToast(error, { title: "Show in Finder failed" });
    }
  }

  const markdown = useMemo(() => {
    const parts: string[] = ["# Request Finished"];

    if (props.outputUrl && isImageUrl(props.outputUrl)) {
      parts.push(`## Output\n![](${props.outputUrl})`);
    } else if (outputFilePath && isImageUrl(outputFilePath)) {
      parts.push(`## Output\n![](${toMarkdownFileUrl(outputFilePath)})`);
    } else if (props.outputUrl && isVideoUrl(props.outputUrl)) {
      parts.push(`## Output\n[Open Video Output](${props.outputUrl})`);
    } else if (props.outputUrl) {
      parts.push(`## Output\n[Open Output](${props.outputUrl})`);
    } else if (outputFilePath) {
      parts.push(`## Output\n\`${outputFilePath}\``);
    } else {
      parts.push("## Output\nNo output file was detected in this response.");
    }

    parts.push(
      `## Response\n\`\`\`json\n${truncateResponseJson(props.responseJson)}\n\`\`\``,
    );

    return parts.join("\n\n");
  }, [outputFilePath, props.outputUrl, props.responseJson]);

  return (
    <Detail
      isLoading={isPreparingOutputFile}
      navigationTitle="Request Finished"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Endpoint" text={props.endpointId} />
          <Detail.Metadata.Label
            title="Clipboard"
            text={
              props.copiedKind === "file"
                ? "Output file copied"
                : "JSON response copied"
            }
          />
          {props.outputUrl ? (
            <Detail.Metadata.Link
              title="Output URL"
              target={props.outputUrl}
              text={props.outputUrl}
            />
          ) : null}
          {outputFilePath ? (
            <Detail.Metadata.Label title="Local Output" text={outputFilePath} />
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Back"
            text="Press Esc or use Back to Prompt"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Back to Prompt" icon={Icon.ArrowLeft} onAction={pop} />
          {props.outputUrl || outputFilePath ? (
            <Action
              title="Copy Output File"
              icon={Icon.Clipboard}
              onAction={copyOutputFile}
            />
          ) : null}
          <Action
            title="Copy JSON Response"
            icon={Icon.Document}
            onAction={copyJsonResponse}
          />
          {props.outputUrl ? (
            <Action
              title="Open Output in Browser"
              icon={Icon.Globe}
              onAction={openOutputInBrowser}
            />
          ) : null}
          {outputFilePath ? (
            <Action
              title="Open Output File"
              icon={Icon.Folder}
              onAction={openOutputFile}
            />
          ) : null}
          {outputFilePath ? (
            <Action
              title="Show Output in Finder"
              icon={Icon.Folder}
              onAction={revealOutputInFinder}
            />
          ) : null}
          {props.outputUrl ? (
            <Action
              title="Copy Output URL"
              icon={Icon.Link}
              onAction={copyOutputUrl}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
