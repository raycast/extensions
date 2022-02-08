import { ActionPanel, copyTextToClipboard, Form, open, showToast, SubmitFormAction, ToastStyle } from "@raycast/api";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import QRCode from "qrcode";

interface CommandForm {
  url: string;
  open: boolean;
}

const onQRCodeReady = (url: string, filename: string) => {
  copyTextToClipboard(url);

  const path = `${homedir()}/Downloads/qrcode-${filename}.png`;

  const encodedUrl = url.replace(/^data:image\/[a-z]+;base64,/, "");
  writeFile(path, encodedUrl, "base64")
    .then(() => {
      showToast(ToastStyle.Success, "QRCode saved!", `You can find it here: ${path}`);
      open(path);
    })
    .catch((err) => {
      showToast(ToastStyle.Failure, "Error during saving", err.message);
    });
};

export default function Command() {
  function handleSubmit(values: CommandForm) {
    // `https://www.example.com/foo?bar=foo` -> `www.example.com`
    const domainName = String(values.url.match(/^(?:https?:\/\/)?(?:[^@/\n]+@)?(?:www\.)?([^:/\n]+)/gm)).replace(
      /^(?:https?:\/\/)?/gm,
      ""
    );

    if (values.url.length === 0) {
      showToast(ToastStyle.Failure, "Please enter a URL");
      return;
    }

    QRCode.toDataURL(values.url, function (err, url) {
      if (err) {
        showToast(ToastStyle.Failure, "Error generating QR code");
        return;
      }

      onQRCodeReady(url, domainName);
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
