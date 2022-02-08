import { ActionPanel, Form, open, showToast, SubmitFormAction, ToastStyle } from "@raycast/api";
import { homedir } from "os";
import QRCode from "qrcode";

interface CommandForm {
  url: string;
  open: boolean;
}

const getQRCodePath = (qrcodeUrl: string) => {
  // `https://www.example.com/foo?bar=foo` -> `www.example.com`
  const filename = String(qrcodeUrl.match(/^(?:https?:\/\/)?(?:[^@/\n]+@)?(?:www\.)?([^:/\n]+)/gm)).replace(
    /^(?:https?:\/\/)?/gm,
    ""
  );

  return `${homedir()}/Downloads/qrcode-${filename}.png`;
};

export default function Command() {
  function handleSubmit({ url }: CommandForm) {
    if (url.length === 0) {
      showToast(ToastStyle.Failure, "Please enter a URL");
      return;
    }

    const path = getQRCodePath(url);

    QRCode.toFile(path, url)
      .then(() => {
        showToast(ToastStyle.Success, "QRCode saved", `You can find it here: ${path}`);
        open(path);
      })
      .catch((error: Error) => {
        showToast(ToastStyle.Failure, "Error generating QR code", error.message);
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="https://google.com" />
    </Form>
  );
}
