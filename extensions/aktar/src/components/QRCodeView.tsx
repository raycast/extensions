import { Action, ActionPanel, Clipboard, Detail, Icon, Keyboard, showInFinder, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { pathToFileURL } from "node:url";
import { useState } from "react";
import { showAktarFailure } from "../lib/errors";
import { ensureQRCode, saveQRCode, writeQRCode } from "../lib/qr";

type Link = {
  url: string;
  /** Shown under the link, e.g. when a temporary link expires. */
  note?: string;
  /** When a temporary link stops working; its QR image is removed after that. */
  expiresAt?: string;
};

type Resolved = Link & {
  /** The QR code PNG, or undefined when the link couldn't be made into one (see `qrError`). */
  file?: string;
  qrError?: string;
};

type Props = {
  /** The file the link points to; names the saved image and the view. */
  name: string;
  /** The link, or how to create it (e.g. a temporary link made when the view opens). */
  link: string | (() => Promise<Link>);
};

/** Shown on screen at this size; the PNG itself has 10 pixels per module, so it stays sharp. */
const DISPLAY_SIZE = 300;

/** A QR code for a link, with the link below it and actions to copy or save the image. */
export function QRCodeView({ name, link }: Props) {
  // Kept from the first render, so a new function on every render doesn't create a new link each time.
  const [source] = useState(() => link);
  const canRefresh = typeof source === "function";
  const { data, error, isLoading, revalidate } = usePromise(
    async (from: Props["link"]): Promise<Resolved> => {
      const resolved: Link = typeof from === "string" ? { url: from } : await from();
      // A link too long for a QR code is still worth showing, with its own actions.
      try {
        return { ...resolved, file: await writeQRCode(resolved.url, resolved.expiresAt) };
      } catch (qrError) {
        return { ...resolved, qrError: qrError instanceof Error ? qrError.message : String(qrError) };
      }
    },
    [source],
    {
      onError: (error) => {
        showAktarFailure(error, "Couldn't create the link");
      },
    },
  );

  const refreshAction = canRefresh && (
    <Action
      title="Create New Link"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={revalidate}
    />
  );

  let markdown = "";
  if (data) {
    markdown = [
      data.file
        ? `![QR code for the link](${pathToFileURL(data.file).href}?raycast-width=${DISPLAY_SIZE}&raycast-height=${DISPLAY_SIZE})`
        : `Couldn't create the QR code: ${data.qrError}`,
      "```\n" + data.url + "\n```",
      data.note ?? "",
    ].join("\n\n");
  } else if (error && !isLoading) {
    markdown = `Couldn't create the link: ${error.message}`;
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`QR Code for ${name}`}
      markdown={markdown}
      actions={
        data ? (
          <ActionPanel>
            <ActionPanel.Section>
              <Action.CopyToClipboard title="Copy Link" content={data.url} />
              <Action.OpenInBrowser url={data.url} />
            </ActionPanel.Section>
            {data.file && <QRCodeActions file={data.file} link={data} name={name} />}
            {refreshAction && <ActionPanel.Section>{refreshAction}</ActionPanel.Section>}
          </ActionPanel>
        ) : (
          error &&
          refreshAction && (
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          )
        )
      }
    />
  );
}

function QRCodeActions({ file, link, name }: { file: string; link: Link; name: string }) {
  return (
    <ActionPanel.Section>
      <Action
        title="Copy QR Code Image"
        icon={Icon.Image}
        shortcut={Keyboard.Shortcut.Common.Copy}
        onAction={async () => {
          try {
            await Clipboard.copy({ file: await ensureQRCode(file, link.url, link.expiresAt) });
            await showToast({ style: Toast.Style.Success, title: "Copied QR code image" });
          } catch (error) {
            await showAktarFailure(error, "Couldn't copy the QR code");
          }
        }}
      />
      <Action
        title="Save QR Code"
        icon={Icon.Download}
        shortcut={Keyboard.Shortcut.Common.Save}
        onAction={async () => {
          try {
            const saved = await saveQRCode(await ensureQRCode(file, link.url, link.expiresAt), name);
            await showInFinder(saved);
            await showToast({ style: Toast.Style.Success, title: "Saved QR code to Downloads" });
          } catch (error) {
            await showAktarFailure(error, "Couldn't save the QR code");
          }
        }}
      />
    </ActionPanel.Section>
  );
}
