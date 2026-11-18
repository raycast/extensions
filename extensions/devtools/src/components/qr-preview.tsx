import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { useState } from "react";
import { codeBlock } from "../lib/markdown";
import { generateQr } from "../lib/qr";
import { qrImageDataUrl, qrPreviewMarkdown, qrTemporaryFile } from "../lib/qr-preview";
import { UrlInput } from "./url-input";

function SaveImage({ image }: { image: Buffer }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();
  return (
    <Form
      navigationTitle="Save QR Code as PNG"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save PNG"
            onSubmit={async (values: { folder: string[] }) => {
              if (!values.folder[0]) {
                setError("Select a destination folder.");
                return;
              }
              const target = path.join(values.folder[0], `qrcode-${Date.now()}.png`);
              try {
                await writeFile(target, image, { flag: "wx" });
                await showToast({ style: Toast.Style.Success, title: "QR Code Saved", message: target });
                pop();
              } catch (cause) {
                await showFailureToast(cause, { title: "Unable to Save Image" });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Destination Folder"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        error={error}
        onChange={() => setError(undefined)}
      />
      <Form.Description text="Saves a 512 × 512 PNG with the current timestamp in its filename." />
    </Form>
  );
}

function EditUrlAction({ url }: { url: string }) {
  const { push } = useNavigation();
  return (
    <Action
      title="Edit URL"
      icon={Icon.Pencil}
      onAction={() =>
        push(
          <UrlInput
            title="Enter URL"
            initialValue={url}
            onSubmit={(input) => push(<QrCodePreview url={input} navigationTitle="URL QR Code" />)}
          />,
        )
      }
    />
  );
}

async function loadPreview(url: string) {
  const image = await generateQr(url);
  return { url, image, imageDataUrl: qrImageDataUrl(image) };
}

export function QrCodePreview({
  url,
  allowEdit = true,
  navigationTitle,
}: {
  url: string;
  allowEdit?: boolean;
  navigationTitle?: string;
}) {
  const { data, error, isLoading } = usePromise(loadPreview, [url], {
    onError: () => {
      // The preview displays generation errors inline.
    },
  });
  const { push } = useNavigation();
  const current = data?.url === url ? data : undefined;
  const image = current?.image;
  const imageDataUrl = current?.imageDataUrl;

  return (
    <Detail
      navigationTitle={navigationTitle}
      isLoading={isLoading}
      markdown={
        imageDataUrl
          ? qrPreviewMarkdown(imageDataUrl, url)
          : error
            ? `Unable to generate QR code: ${error.message}\n\n${codeBlock(url)}`
            : "Generating QR code…"
      }
      actions={
        <ActionPanel>
          {image && (
            <>
              <Action
                title="Copy QR Code Image"
                icon={Icon.Clipboard}
                onAction={async () => {
                  try {
                    await Clipboard.copy({ file: await qrTemporaryFile(image) });
                    await showToast({ style: Toast.Style.Success, title: "QR Code Image Copied" });
                  } catch (cause) {
                    await showFailureToast(cause, { title: "Unable to Copy Image" });
                  }
                }}
              />
              <Action title="Save PNG" icon={Icon.Download} onAction={() => push(<SaveImage image={image} />)} />
              <Action
                title="Open Image"
                icon={Icon.Eye}
                onAction={async () => {
                  try {
                    await open(await qrTemporaryFile(image));
                  } catch (cause) {
                    await showFailureToast(cause, { title: "Unable to Open Image" });
                  }
                }}
              />
              <Action.CopyToClipboard title="Copy URL" content={url} />
            </>
          )}
          {allowEdit && <EditUrlAction url={url} />}
        </ActionPanel>
      }
    />
  );
}
