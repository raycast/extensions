import { Action, ActionPanel, Form, getPreferenceValues, showToast, Toast } from "@raycast/api";
import QRCode from "qrcode";
import { useState } from "react";
import { generateQRCode, getQRCodePath, QRCodeView } from "./utils";
import { FormValidation, useForm } from "@raycast/utils";
import { randomBytes } from "crypto";
var open = require('mac-open');
interface FormValues {
  url: string;
  inline: boolean;
}

export default function Command() {
  const [qrData, setQrData] = useState<string>();randomBytes
  const primAction= getPreferenceValues().primaryAction;

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
            showToast(Toast.Style.Success, "Code saved", `You can find it here: ${path}`);
            open(path, {R: true});
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

    return primAction === "save" ? (
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
