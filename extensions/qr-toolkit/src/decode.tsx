import { Action, ActionPanel, Color, Detail, Form, Icon, open, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { getClipboardImagePath } from "./utils/clipboard-image";
import { decodeQR } from "./utils/decode-image";
import { detectContent, QRContent, QRContentType } from "./utils/detect-content";
import { t } from "./utils/i18n";

// ─── helpers ────────────────────────────────────────────────────────────────

function typeLabel(type: QRContentType): string {
  switch (type) {
    case "url":
      return t("type_url");
    case "wifi":
      return t("type_wifi");
    case "vcard":
      return t("type_vcard");
    case "text":
      return t("type_text");
  }
}

function typeColor(type: QRContentType): Color {
  switch (type) {
    case "url":
      return Color.Blue;
    case "wifi":
      return Color.Green;
    case "vcard":
      return Color.Purple;
    case "text":
      return Color.SecondaryText;
  }
}

function typeIcon(type: QRContentType): Icon {
  switch (type) {
    case "url":
      return Icon.Globe;
    case "wifi":
      return Icon.Wifi;
    case "vcard":
      return Icon.Person;
    case "text":
      return Icon.Text;
  }
}

// ─── result view ────────────────────────────────────────────────────────────

function buildResultMarkdown(info: QRContent): string {
  const lines: string[] = [];

  if (info.type === "url" && info.url) {
    lines.push(`## ${t("decode_result_title")}`, "", `${info.url}`, "", "---", "", `\`\`\`\n${info.raw}\n\`\`\``);
  } else if (info.type === "wifi" && info.wifi) {
    lines.push(
      `## ${t("decode_result_title")}`,
      "",
      `| | |`,
      `|---|---|`,
      `| **SSID** | ${info.wifi.ssid} |`,
      `| **${t("decode_encryption")}** | ${info.wifi.encryption.toUpperCase()} |`,
      `| **Password** | \`${info.wifi.password}\` |`,
    );
  } else {
    lines.push(`## ${t("decode_result_title")}`, "", `\`\`\`\n${info.raw}\n\`\`\``);
  }

  return lines.join("\n");
}

function ResultView({ info }: { info: QRContent }) {
  const { pop } = useNavigation();

  return (
    <Detail
      navigationTitle={t("decode_result_title")}
      markdown={buildResultMarkdown(info)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title={t("decode_type")}>
            <Detail.Metadata.TagList.Item
              text={typeLabel(info.type)}
              color={typeColor(info.type)}
              icon={typeIcon(info.type)}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title={t("decode_length")} text={`${info.raw.length}`} icon={Icon.TextCursor} />

          {info.type === "url" && info.url && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Link title="URL" target={info.url} text={info.url} />
            </>
          )}

          {info.type === "wifi" && info.wifi && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title={t("decode_network")} text={info.wifi.ssid} icon={Icon.Wifi} />
              <Detail.Metadata.Label
                title={t("decode_encryption")}
                text={info.wifi.encryption.toUpperCase()}
                icon={Icon.Lock}
              />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title={t("decode_copy")} content={info.raw} icon={Icon.CopyClipboard} />
            {info.type === "url" && info.url && (
              <Action title={t("decode_open_url")} icon={Icon.Globe} onAction={() => open(info.url!)} />
            )}
            {info.type === "wifi" && info.wifi && (
              <Action.CopyToClipboard title={t("decode_copy_password")} content={info.wifi.password} icon={Icon.Key} />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={t("decode_back")}
              icon={Icon.ArrowLeft}
              onAction={pop}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ErrorView({ message }: { message: string }) {
  const { pop } = useNavigation();
  return (
    <Detail
      navigationTitle={t("decode_error_title")}
      markdown={`## ${t("decode_error_title")}\n\n${message}`}
      actions={
        <ActionPanel>
          <Action title={t("decode_back")} icon={Icon.ArrowLeft} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

export default function DecodeCommand() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<string[]>([]);

  function runDecode(filePath: string) {
    setIsLoading(true);
    decodeQR(filePath)
      .then((raw) => {
        if (raw) {
          push(<ResultView info={detectContent(raw)} />);
        } else {
          push(<ErrorView message={t("decode_no_qr")} />);
        }
      })
      .catch((err) => push(<ErrorView message={String(err)} />))
      .finally(() => setIsLoading(false));
  }

  // On mount: check clipboard for an image and auto-decode if found
  // Only navigate on success — stay on form silently if no QR code detected
  useEffect(() => {
    getClipboardImagePath()
      .then((clipPath) => {
        if (!clipPath) return;
        return decodeQR(clipPath).then((raw) => {
          if (raw) {
            push(<ResultView info={detectContent(raw)} />);
          }
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  function handleSubmit() {
    const target = files[0];
    if (!target) {
      showToast({ style: Toast.Style.Failure, title: t("decode_no_image") });
      return;
    }
    runDecode(target);
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("decode_submit")} icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={t("decode_clipboard_hint")} />
      <Form.FilePicker
        id="file"
        title={t("decode_file_title")}
        allowMultipleSelection={false}
        value={files}
        onChange={setFiles}
      />
    </Form>
  );
}
