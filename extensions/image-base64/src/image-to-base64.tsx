import { Form, ActionPanel, Action, showToast, Detail, Toast, Icon, Clipboard } from "@raycast/api";
import { useState } from "react";
import fs from "fs";
import path from "path";
import { getImageDimensionsFromBase64, formatFileSize } from "./libs/imageUtils";

interface Image {
  base64: string;
  fileName: string;
  size: number;
  dimensions: {
    width: number;
    height: number;
  };
}

export default function ImageToBase64() {
  const [image, setImage] = useState<Image | null>(null);

  const handleSubmit = async (values: { filePath: string[] }) => {
    const filePath = values.filePath[0];
    if (!filePath) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please select an image file",
      });
      return;
    }

    try {
      const imageBuffer = fs.readFileSync(filePath);
      const base64String = imageBuffer.toString("base64");
      const fileName = path.basename(filePath);
      const stats = fs.statSync(filePath);

      const base64 = `data:image/${path.extname(filePath).slice(1)};base64,${base64String}`;

      setImage({
        base64,
        fileName: fileName,
        size: stats.size,
        dimensions: getImageDimensionsFromBase64(base64) ?? { width: 0, height: 0 },
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to convert image to base64",
      });
    }
  };

  const handleCopyToClipboard = async () => {
    if (!image) return;
    await Clipboard.copy(image.base64);
    showToast({
      style: Toast.Style.Success,
      title: "Success",
      message: "Base64 string copied to clipboard",
    });
  };

  if (image) {
    return (
      <Detail
        markdown={`![Converted Image](${image.base64})`}
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
                title="Copy Base64 to Clipboard"
                onAction={handleCopyToClipboard}
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="File Name" text={image.fileName} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Dimensions" text={`${image.dimensions.width}x${image.dimensions.height}`} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Size" text={formatFileSize(image.size)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Actions">
              <Detail.Metadata.TagList.Item text="Copy Base64" color={"#32D74B"} />
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
          <Action.SubmitForm title="Convert to Base64" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="filePath" title="Select Image" allowMultipleSelection={false} canChooseDirectories={false} />
    </Form>
  );
}
