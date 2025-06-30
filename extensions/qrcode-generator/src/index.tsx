import { Action, ActionPanel, Form, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import QRCode from "qrcode";
import { useState } from "react";
import { generateQRCode, getQRCodePath, QRCodeView } from "./utils";
import { FormValidation, useForm, showFailureToast } from "@raycast/utils";
import fs from "fs";
import { QR_OPTIONS, SVG_OPTIONS, QR_OPTIONS_PREVIEW } from "./config";

interface FormValues {
  url: string;
  inline: boolean;
  format: "png" | "svg" | "png-bg";
}

interface Preferences {
  Index: {
    primaryAction: "save" | "inline";
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
    },
    initialValues: {
      format: "png",
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

    return primaryAction === "save" ? (
      <>
        {saveAction}
        {showAction}
      </>
    ) : (
      <>
        {showAction}
        {saveAction}
      </>
    );
  };

  if (qrData) {
    return <QRCodeView qrData={qrData} height={350} />;
  }

  return (
    <Form actions={<ActionPanel>{renderActions()}</ActionPanel>}>
      <Form.TextField title="URL or Content" placeholder="https://google.com" {...itemProps.url} />
      <Form.Dropdown
        id="format"
        title="Format"
        value={itemProps.format.value}
        onChange={(value) => itemProps.format.onChange?.(value as "png" | "svg" | "png-bg")}
      >
        <Form.Dropdown.Item value="png" title="PNG (Transparent)" />
        <Form.Dropdown.Item value="png-bg" title="PNG (w/BG)" />
        <Form.Dropdown.Item value="svg" title="SVG" />
      </Form.Dropdown>
    </Form>
  );
}
