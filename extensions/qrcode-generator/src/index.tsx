import { Action, ActionPanel, Form, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import QRCode from "qrcode";
import { useState } from "react";
import { generateQRCode, getQRCodePath, QRCodeView } from "./utils";
import { FormValidation, useForm } from "@raycast/utils";

interface FormValues {
  url: string;
  inline: boolean;
  format: "png" | "svg";
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
      console.log({ values });
      if (values.inline) {
        const qrData = await generateQRCode(values.url, values.format);
        if (qrData) {
          setQrData(qrData);
        }
      } else {
        const path = getQRCodePath(values.url, values.format);
        if (values.format === "svg") {
          QRCode.toString(values.url, { type: "svg", width: 512, color: { dark: "#000000", light: "none" } })
            .then((svg) => {
              require("fs").writeFileSync(path, svg);
              showToast(Toast.Style.Success, "QRCode saved", `You can find it here: ${path}`);
              open(path);
            })
            .catch((error: Error) => {
              showToast(Toast.Style.Failure, "Error generating QR code", error.message);
            });
        } else {
          QRCode.toFile(path, values.url, { width: 512, color: { dark: "#000000", light: "#0000" } })
            .then(() => {
              showToast(Toast.Style.Success, "QRCode saved", `You can find it here: ${path}`);
              open(path);
            })
            .catch((error: Error) => {
              showToast(Toast.Style.Failure, "Error generating QR code", error.message);
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
    return <QRCodeView qrData={qrData} />;
  }

  return (
    <Form actions={<ActionPanel>{renderActions()}</ActionPanel>}>
      <Form.TextField title="URL or Content" placeholder="https://google.com" {...itemProps.url} />
      <Form.Dropdown
        id="format"
        title="Format"
        value={itemProps.format.value}
        onChange={(value) => itemProps.format.onChange?.(value as "png" | "svg")}
      >
        <Form.Dropdown.Item value="png" title="PNG" />
        <Form.Dropdown.Item value="svg" title="SVG" />
      </Form.Dropdown>
    </Form>
  );
}
