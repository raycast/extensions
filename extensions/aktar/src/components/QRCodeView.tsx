import { Action, ActionPanel, Clipboard, Detail, Icon, Keyboard, showInFinder, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { pathToFileURL } from "node:url";
import { useState } from "react";
import { showAktarFailure } from "../lib/errors";
import { saveQRCode, writeQRCode } from "../lib/qr";

type Link = {
  url: string;
  /** Shown under the link, e.g. when a temporary link expires. */
  note?: string;
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
  const { data, isLoading } = usePromise(
    async (from: Props["link"]) => {
      const resolved: Link = typeof from === "string" ? { url: from } : await from();
      return { ...resolved, file: await writeQRCode(resolved.url) };
    },
    [source],
    {
      onError: (error) => {
        showAktarFailure(error, "Couldn't create the QR code");
      },
    },
  );

  const markdown = data
    ? [
        `![QR code for the link](${pathToFileURL(data.file).href}?raycast-width=${DISPLAY_SIZE}&raycast-height=${DISPLAY_SIZE})`,
        "```\n" + data.url + "\n```",
        data.note ?? "",
      ].join("\n\n")
    : "";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`QR Code for ${name}`}
      markdown={markdown}
      actions={
        data && (
          <ActionPanel>
            <ActionPanel.Section>
              <Action.CopyToClipboard title="Copy Link" content={data.url} />
              <Action.OpenInBrowser url={data.url} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Copy QR Code Image"
                icon={Icon.Image}
                shortcut={Keyboard.Shortcut.Common.Copy}
                onAction={async () => {
                  await Clipboard.copy({ file: data.file });
                  await showToast({ style: Toast.Style.Success, title: "Copied QR code image" });
                }}
              />
              <Action
                title="Save QR Code"
                icon={Icon.Download}
                shortcut={Keyboard.Shortcut.Common.Save}
                onAction={async () => {
                  try {
                    const saved = await saveQRCode(data.file, name);
                    await showInFinder(saved);
                    await showToast({ style: Toast.Style.Success, title: "Saved QR code to Downloads" });
                  } catch (error) {
                    await showAktarFailure(error, "Couldn't save the QR code");
                  }
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        )
      }
    />
  );
}
