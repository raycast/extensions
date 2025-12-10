import { Action, ActionPanel, Clipboard, Detail, Form, Icon, Toast, showToast } from "@raycast/api";
import QRCode from "qrcode";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { useEffect, useState } from "react";

const OUTPUT_FILE_NAME = "clipboard-qr.png";
const QR_OPTIONS = {
  width: 512,
  margin: 1,
  errorCorrectionLevel: "H" as const,
};

export default function Command() {
  const [content, setContent] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>();
  const [generatedContent, setGeneratedContent] = useState<string>();
  const [imagePath, setImagePath] = useState<string>();
  const [usedClipboardDefault, setUsedClipboardDefault] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const clipboardText = await Clipboard.readText();
        if (isMounted && clipboardText) {
          setContent(clipboardText);
          setUsedClipboardDefault(true);
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (formContent: string) => {
    if (isGenerating) {
      return;
    }

    const trimmedContent = formContent.trim();
    if (!trimmedContent) {
      await showToast({ style: Toast.Style.Failure, title: "Add some content first" });
      return;
    }

    setIsGenerating(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating QR code" });

    try {
      const [dataUrl, buffer] = await Promise.all([
        QRCode.toDataURL(trimmedContent, QR_OPTIONS),
        QRCode.toBuffer(trimmedContent, { ...QR_OPTIONS, type: "png" }),
      ]);

      const directory = await mkdtemp(join(tmpdir(), "raycast-qr-"));
      const filePath = join(directory, OUTPUT_FILE_NAME);
      await writeFile(filePath, buffer);
      toast.style = Toast.Style.Success;
      toast.title = "QR code ready";
      toast.message = "Use the shortcuts below to copy it";

      setQrDataUrl(dataUrl);
      setGeneratedContent(trimmedContent);
      setImagePath(filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create QR code";
      toast.message = message;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAnother = () => {
    setQrDataUrl(undefined);
    setGeneratedContent(undefined);
    setImagePath(undefined);
    setIsGenerating(false);
  };

  if (qrDataUrl && generatedContent) {
    const markdown = `<div style="text-align: center"><img src="${qrDataUrl}" width="240" height="240" style="image-rendering: pixelated" /></div>\n\n**Content**\n\n\`\`\`\n${generatedContent}\n\`\`\``;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title="Generate Another"
              icon={Icon.RotateAntiClockwise}
              shortcut={{ modifiers: ["ctrl"], key: "n" }}
              onAction={() => {
                setContent(generatedContent);
                handleGenerateAnother();
              }}
            />
            <Action.CopyToClipboard
              title="Copy Content"
              content={generatedContent}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "c" }}
            />
            {imagePath ? (
              <Action
                title="Copy QR Image"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["ctrl"], key: "c" }}
                onAction={async () => {
                  await Clipboard.copy({ file: imagePath });
                  await showToast({ style: Toast.Style.Success, title: "QR image copied" });
                }}
              />
            ) : null}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isInitializing || isGenerating}
      actions={
        <ActionPanel>
          <Action
            title={isGenerating ? "Generating" : "Generate QR Code"}
            icon={Icon.BarCode}
            shortcut={{ modifiers: ["ctrl"], key: "enter" }}
            onAction={() => handleSubmit(content)}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="QR Code Content"
        value={content}
        onChange={setContent}
        placeholder="Paste or type anything..."
        autoFocus
      />
      {usedClipboardDefault ? (
        <Form.Description title="Clipboard" text="We prefilled the last thing you copied." />
      ) : (
        <Form.Description title="Tip" text="Leave this field blank to paste something new." />
      )}
    </Form>
  );
}
