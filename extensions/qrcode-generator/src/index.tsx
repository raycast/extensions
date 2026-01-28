import { Action, ActionPanel, Form, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import fs from "fs";
import QRCode from "qrcode";
import { useState } from "react";
import { QR_OPTIONS, QR_OPTIONS_PREVIEW, SVG_OPTIONS } from "./config";
import { copyQRCodeToClipboard, generateQRCode, getQRCodePath, QRCodeView } from "./utils";

type FormatValue = "png" | "svg" | "png-bg";

interface FormValues {
  url: string;
  inline: boolean;
  copy?: boolean;
  format: FormatValue;
}

interface Preferences {
  Index: {
    primaryAction: "save" | "inline" | "copy";
  };
}

export default function Command() {
  const [qrData, setQrData] = useState<string>();
  const { primaryAction } = getPreferenceValues<Preferences["Index"]>();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      if (values.inline) {
        try {
          let qrData;
          if (values.format === "png-bg") {
            qrData = await generateQRCode({ URL: values.url, format: "png", preview: true });
          } else {
            qrData = await generateQRCode({ URL: values.url, format: values.format });
          }
          if (!qrData) {
            throw new Error("Failed to generate QR code");
          }
          setQrData(qrData);
        } catch (error) {
          await showFailureToast({
            title: "Error",
            message: error instanceof Error ? error.message : "Failed to generate QR code",
          });
        }
      } else if (values.copy) {
        await copyQRCodeToClipboard({ url: values.url, format: values.format });
      } else {
        try {
          const path = getQRCodePath(values.url, "png");
          if (values.format === "svg") {
            const svg = await QRCode.toString(values.url, {
              type: "svg",
              width: SVG_OPTIONS.width,
              color: SVG_OPTIONS.color,
            });
            fs.writeFileSync(path.replace(/\.png$/, ".svg"), svg);
            showToast(Toast.Style.Success, "QRCode saved", `You can find it here: ${path.replace(/\.png$/, ".svg")}`);
            open(path.replace(/\.png$/, ".svg"));
          } else if (values.format === "png-bg") {
            await QRCode.toFile(path, values.url, QR_OPTIONS_PREVIEW);
            showToast(Toast.Style.Success, "QRCode saved", `You can find it here: ${path}`);
            open(path);
          } else {
            await QRCode.toFile(path, values.url, QR_OPTIONS);
            showToast(Toast.Style.Success, "QRCode saved", `You can find it here: ${path}`);
            open(path);
          }
        } catch (error) {
          await showFailureToast({
            title: "Error",
            message: error instanceof Error ? error.message : "Failed to save QR code",
          });
        }
      }
    },
    validation: {
      url: FormValidation.Required,
      format: FormValidation.Required,
    },
  });

  const renderActions = () => {
    const saveAction = (
      <Action.SubmitForm
        title="Generate and Save"
        onSubmit={(values) => {
          handleSubmit({ ...values, inline: false } as FormValues);
        }}
      />
    );

    const showAction = (
      <Action.SubmitForm
        title="Generate and Show"
        onSubmit={(values) => {
          handleSubmit({ ...values, inline: true } as FormValues);
        }}
      />
    );

    const copyAction = (
      <Action.SubmitForm
        title="Generate and Copy to Clipboard"
        onSubmit={(values) => {
          handleSubmit({ ...values, inline: false, copy: true } as FormValues);
        }}
      />
    );

    if (primaryAction === "save") {
      return (
        <>
          {saveAction}
          {showAction}
          {copyAction}
        </>
      );
    } else if (primaryAction === "copy") {
      return (
        <>
          {copyAction}
          {saveAction}
          {showAction}
        </>
      );
    } else {
      return (
        <>
          {showAction}
          {saveAction}
          {copyAction}
        </>
      );
    }
  };

  if (qrData) {
    return <QRCodeView qrData={qrData} height={350} onBack={() => setQrData(undefined)} />;
  }

  return (
    <Form actions={<ActionPanel>{renderActions()}</ActionPanel>}>
      <Form.TextField title="URL or Content" placeholder="https://google.com" {...itemProps.url} />
      <Form.Dropdown
        id="format"
        title="Format"
        storeValue
        value={itemProps.format.value}
        onChange={(value) => {
          itemProps.format.onChange?.(value as FormatValue);
        }}
      >
        <Form.Dropdown.Item value="png" title="PNG (Transparent)" />
        <Form.Dropdown.Item value="png-bg" title="PNG (w/BG)" />
        <Form.Dropdown.Item value="svg" title="SVG" />
      </Form.Dropdown>
    </Form>
  );
}
