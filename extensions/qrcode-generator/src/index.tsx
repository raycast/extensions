import { Action, ActionPanel, Form, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import QRCode from "qrcode";
import { useState } from "react";
import { generateQRCode, getQRCodePath, QRCodeView } from "./utils";
import { FormValidation, useForm } from "@raycast/utils";

interface FormValues {
  url: string;
  inline: boolean;
}

export default function Command() {
  const [qrData, setQrData] = useState<string>();
  const { primaryAction } = getPreferenceValues<Preferences.Index>();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      console.log({ values });
      if (values.inline) {
        const qrData = await generateQRCode(values.url);
        setQrData(qrData);
      } else {
        const path = getQRCodePath(values.url);
        QRCode.toFile(path, values.url)
          .then(() => {
            showToast(Toast.Style.Success, "QRCode saved", `You can find it here: ${path}`);
            open(path);
          })
          .catch((error: Error) => {
            showToast(Toast.Style.Failure, "Error generating QR code", error.message);
          });
      }
    },
    validation: {
      url: FormValidation.Required,
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
    return <QRCodeView qrData={qrData || ""} />;
  }

  return (
    <Form actions={<ActionPanel>{renderActions()}</ActionPanel>}>
      <Form.TextField title="URL or Content" placeholder="https://google.com" {...itemProps.url} />
    </Form>
  );
}
