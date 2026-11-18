import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
  getSelectedText,
} from "@raycast/api";
import { useEffect, useState } from "react";
import path from "node:path";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";
import {
  generateQr,
  parsePositiveInteger,
  validateLogoSelection,
  QrErrorLevel,
  QrResult,
} from "./qr-helper";

type FormValues = {
  data: string;
  size: string;
  foreground: string;
  background: string;
  logo: string[];
  errorLevel: QrErrorLevel;
};

export default function Command() {
  const [isDelphitoolsInstalled, setIsDelphitoolsInstalled] =
    useState<boolean>();

  useEffect(() => {
    async function checkInstallStatus() {
      const status = await getDelphitoolsInstallStatus();
      setIsDelphitoolsInstalled(status.installed);
    }

    checkInstallStatus();
  }, []);

  if (isDelphitoolsInstalled === false) {
    return <DelphitoolsInstallStatusView status={{ installed: false }} />;
  }

  return <QrForm isCheckingInstall={isDelphitoolsInstalled === undefined} />;
}

function QrForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();
  const [data, setData] = useState("");

  useEffect(() => {
    async function hydrateInitialInput() {
      try {
        const selectedText = await getSelectedText();
        if (selectedText.trim()) {
          setData(selectedText.trim());
          return;
        }
      } catch {
        // Selection is optional; fallback to clipboard.
      }

      try {
        const clipboardText = await Clipboard.readText();
        if (clipboardText?.trim()) {
          setData(clipboardText.trim());
        }
      } catch {
        // Clipboard is optional.
      }
    }

    hydrateInitialInput();
  }, []);

  async function handleSubmit(values: FormValues) {
    const rawData = values.data.trim();

    if (!rawData) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Data is required",
        message: "Please enter the content to encode in the QR code.",
      });
      return;
    }

    const size = parsePositiveInteger(values.size, "Size");
    if (size instanceof Error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid size",
        message: size.message,
      });
      return;
    }

    const logoError = validateLogoSelection(values.logo);
    if (logoError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid logo file",
        message: logoError,
      });
      return;
    }

    const fg = values.foreground.trim() || "#000000";
    const bg = values.background.trim() || "#ffffff";
    const logoPath =
      values.logo && values.logo.length > 0 ? values.logo[0] : undefined;

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Generating QR Code...",
      });

      const result = await generateQr({
        data: rawData,
        size,
        foreground: fg,
        background: bg,
        logo: logoPath,
        errorLevel: values.errorLevel,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "QR Code generated successfully",
      });

      push(<QrDetail result={result} />);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate QR Code",
        message,
      });
    }
  }

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Code}
            title="Generate QR Code"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="data"
        title="Data"
        placeholder="Text or URL to encode"
        value={data}
        onChange={setData}
      />
      <Form.TextField
        id="size"
        title="Size"
        placeholder="Size in pixels (e.g. 512)"
        defaultValue="512"
      />
      <Form.TextField
        id="foreground"
        title="Foreground Color"
        placeholder="Hex color (e.g. #000000)"
        defaultValue="#000000"
      />
      <Form.TextField
        id="background"
        title="Background Color"
        placeholder="Hex color or 'transparent' (e.g. #ffffff)"
        defaultValue="#ffffff"
      />
      <Form.FilePicker
        id="logo"
        title="Logo Image"
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
      <Form.Dropdown
        id="errorLevel"
        title="Error Correction Level"
        defaultValue="M"
      >
        <Form.Dropdown.Item title="L - Low (7%)" value="L" />
        <Form.Dropdown.Item title="M - Medium (15%)" value="M" />
        <Form.Dropdown.Item title="Q - Quartile (25%)" value="Q" />
        <Form.Dropdown.Item title="H - High (30%)" value="H" />
      </Form.Dropdown>
    </Form>
  );
}

export function QrDetail({ result }: { result: QrResult }) {
  async function copyImage() {
    try {
      await Clipboard.copy({ file: result.outputPath });
      await showToast({
        style: Toast.Style.Success,
        title: "Copied QR Code Image",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not copy image",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const markdown = [
    `# QR Code Preview`,
    "",
    `<img src="${result.outputPath}" width="300" height="300" />`,
    "",
    "## Encoded Data",
    "```text",
    result.data,
    "```",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Open
            icon={Icon.Image}
            title="Open QR Code Image"
            target={result.outputPath}
          />
          <Action
            icon={Icon.Clipboard}
            title="Copy QR Code Image"
            onAction={copyImage}
          />
          <Action.CopyToClipboard
            title="Copy QR Code Image Path"
            content={result.outputPath}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy QR Code Data"
            content={result.data}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          {result.vCardText ? (
            <Action.CopyToClipboard
              title="Copy VCard Text"
              content={result.vCardText}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            />
          ) : null}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Size"
            text={`${result.size}x${result.size}px`}
          />
          <Detail.Metadata.Label title="Foreground" text={result.foreground} />
          <Detail.Metadata.Label title="Background" text={result.background} />
          <Detail.Metadata.Label title="Error Level" text={result.errorLevel} />
          {result.logo ? (
            <Detail.Metadata.Label
              title="Logo"
              text={path.basename(result.logo)}
            />
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Output Path" text={result.outputPath} />
        </Detail.Metadata>
      }
    />
  );
}
