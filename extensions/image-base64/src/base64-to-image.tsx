import { Form, ActionPanel, Action, showToast, Detail, Toast, Icon, Color } from "@raycast/api";
import { useState } from "react";
import fs from "fs";
import path from "path";
import os from "os";
import { calculateBase64Size, getImageDimensionsFromBase64, isValidBase64, formatFileSize } from "./libs/imageUtils";

type Values = {
  base64: string;
  outputFormat: string;
};

interface Image {
  image: string;
  extension: string;
  size: number;
  dimensions: {
    width: number;
    height: number;
  };
}

export default function Base64ToImage() {
  const [image, setImage] = useState<Image | null>(null);

  async function handleSubmit({ base64, outputFormat }: Values) {
    if (!base64) {
      showToast({
        title: "Error",
        message: "Please enter a base64 string",
        style: Toast.Style.Failure,
      });
      return;
    }

    const cleanedBase64 = base64.replaceAll('"', "").replaceAll("'", "");
    if (!isValidBase64(cleanedBase64)) {
      showToast({
        title: "Error",
        message: "Invalid base64 string. Please check your input.",
        style: Toast.Style.Failure,
      });
      return;
    }

    let imageData: string;
    let extension: string;

    if (!cleanedBase64.startsWith("data:image/")) {
      imageData = `data:image/${outputFormat};base64,${cleanedBase64}`;
      extension = outputFormat;
    } else {
      imageData = cleanedBase64;
      extension = outputFormat || cleanedBase64.split(",")[0].split("/")[1];
    }

    try {
      const dimensions = getImageDimensionsFromBase64(base64);
      setImage({
        image: imageData,
        extension: extension,
        dimensions: dimensions || { width: 0, height: 0 },
        size: calculateBase64Size(base64),
      });
    } catch (error) {
      showToast({
        title: "Error",
        message: "Unsupported image format or invalid base64 string",
        style: Toast.Style.Failure,
      });
    }
  }

  function handleDownload() {
    if (!image) return;

    const downloadsPath = path.join(os.homedir(), "Downloads");
    const fileName = `image_${Date.now()}.${image.extension}`;
    const filePath = path.join(downloadsPath, fileName);

    const base64Data = image.image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        showToast({
          title: "Error",
          message: "Failed to download image",
          style: Toast.Style.Failure,
        });
      } else {
        showToast({
          title: "Success",
          message: `Image downloaded to ${filePath}`,
          style: Toast.Style.Success,
        });
      }
    });
  }

  if (image) {
    return (
      <Detail
        markdown={`![Converted Image](${image.image})`}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title="Convert Another"
                onAction={() => setImage(null)}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Download Image"
                onAction={handleDownload}
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Image Base64"
                content={image.image}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Format" text={image.extension.toUpperCase()} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Dimensions" text={`${image.dimensions.width}x${image.dimensions.height}`} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Size" text={formatFileSize(image.size)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Actions">
              <Detail.Metadata.TagList.Item text="Download" color={Color.Blue} />
              <Detail.Metadata.TagList.Item text="Copy Base64" color={Color.Green} />
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert to Image" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="base64"
        title="Base64"
        placeholder="Paste your base64 image here"
        info="You can also drag and drop a text file containing the base64 string"
      />
      <Form.Dropdown id="outputFormat" title="Output Format" defaultValue="png">
        <Form.Dropdown.Item value="png" title="PNG" />
        <Form.Dropdown.Item value="jpeg" title="JPEG" />
        <Form.Dropdown.Item value="webp" title="WebP" />
      </Form.Dropdown>
    </Form>
  );
}
