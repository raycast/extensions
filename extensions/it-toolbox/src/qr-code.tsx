import { Action, ActionPanel, Detail, Form, Icon, environment, showToast, Toast, useNavigation } from "@raycast/api";
import { writeFileSync } from "fs";
import { join } from "path";
import { useState } from "react";

export default function Command() {
  const { push } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate and Show"
            icon={Icon.BarCode}
            onSubmit={({ text, size }: { text?: string; size?: string }) => {
              if (!text?.trim()) {
                showToast({ style: Toast.Style.Failure, title: "Enter some text first" });
                return;
              }
              push(<QrResult text={text.trim()} size={Number(size) || 320} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Content" placeholder="https://www.raycast.com" enableMarkdown={false} />
      <Form.TextField id="size" title="Size (px)" defaultValue="320" />
    </Form>
  );
}

/**
 * Raycast cannot render an offscreen canvas, so the QR image is requested from a public
 * QR service and shown as remote markdown. The text you submit is sent to that service;
 * everything else in this extension stays on the machine.
 */
function QrResult({ text, size }: { text: string; size: number }) {
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;

  const save = () => {
    const path = join(environment.supportPath, `qrcode-${Date.now()}.txt`);
    writeFileSync(path, `${text}\n${url}\n`, "utf8");
    setSavedPath(path);
    showToast({ style: Toast.Style.Success, title: "Saved", message: path });
  };

  return (
    <Detail
      markdown={`![QR Code](${url})\n\n**Content**\n\n\`\`\`\n${text}\n\`\`\``}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Content" text={text} />
          <Detail.Metadata.Label title="Size" text={`${size}x${size}`} />
          <Detail.Metadata.Link title="Image URL" target={url} text="Open Link" />
          {savedPath ? <Detail.Metadata.Label title="Saved to" text={savedPath} /> : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Image URL" content={url} />
          <Action.OpenInBrowser title="Open in Browser" url={url} />
          <Action title="Save URL to Disk" icon={Icon.Download} onAction={save} />
        </ActionPanel>
      }
    />
  );
}
