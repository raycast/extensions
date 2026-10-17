import { useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  Toast,
  open,
  popToRoot,
  showToast,
} from "@raycast/api";
import type { DynamicCode } from "@open-qr/sdk";
import { client, errorMessage, renderQrPng, safeName } from "./openqr";

interface FormValues {
  destination: string;
  label: string;
  theme: string;
}

export default function Command() {
  const [code, setCode] = useState<DynamicCode | null>(null);
  /** Absolute path of the rendered QR PNG for the short URL. Null if rendering failed. */
  const [qrPath, setQrPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    const destination = values.destination.trim();
    if (!destination) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Destination URL is required",
      });
      return;
    }
    setLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating dynamic code…",
    });
    try {
      const created = await client().createDynamicCode({
        destination,
        label: values.label.trim() || undefined,
        theme: values.theme.trim() || undefined,
      });
      await Clipboard.copy(created.short_url);
      setCode(created);
      toast.style = Toast.Style.Success;
      toast.title = "Dynamic QR code created";
      toast.message = created.short_url;

      // The code exists to be printed, so render the scannable artefact too. A failure here
      // must not lose the code the user just created, so it degrades to link-only.
      try {
        toast.title = "Rendering QR code…";
        const path = await renderQrPng(created.short_url, {
          size: 1024,
          theme: values.theme.trim() || undefined,
          name: safeName(created.slug),
        });
        setQrPath(path);
        toast.title = "Dynamic QR code created";
      } catch {
        toast.title = "Code created, but the QR image could not be rendered";
      }
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create";
      toast.message = errorMessage(e);
    } finally {
      setLoading(false);
    }
  }

  if (code) {
    const markdown = [
      "# Dynamic Code Created",
      "",
      qrPath
        ? `![QR code](file://${qrPath}?raycast-width=240&raycast-height=240)`
        : "_QR image unavailable. The short URL still works._",
      "",
      `**Short URL:** \`${code.short_url}\` _(copied to clipboard)_`,
      "",
      `**Destination:** ${code.destination}`,
      "",
      `**Slug:** \`${code.slug}\``,
    ].join("\n");
    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            {qrPath ? (
              <>
                <Action
                  title="Copy QR Code Image"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    await Clipboard.copy({ file: qrPath });
                    await showToast({
                      style: Toast.Style.Success,
                      title: "QR image copied",
                    });
                  }}
                />
                <Action.ShowInFinder title="Save QR Code Image" path={qrPath} />
                <Action.Open title="Open QR Code Image" target={qrPath} />
              </>
            ) : null}
            <Action.CopyToClipboard
              title="Copy Short URL"
              content={code.short_url}
              icon={Icon.Link}
            />
            <Action.OpenInBrowser title="Open Short URL" url={code.short_url} />
            <Action
              title="Open in Dashboard"
              icon={Icon.AppWindowGrid3x3}
              onAction={() => open("https://openqr.uk/dashboard")}
            />
            <Action
              title="Create Another"
              icon={Icon.Plus}
              onAction={() => {
                setCode(null);
                setQrPath(null);
              }}
            />
            <Action
              title="Done"
              icon={Icon.Check}
              onAction={() => popToRoot()}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create"
            icon={Icon.Link}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Creates an editable short link on oqr.to. Re-point it any time without reprinting the QR." />
      <Form.TextField
        id="destination"
        title="Destination URL"
        placeholder="https://example.com/page"
        autoFocus
      />
      <Form.TextField
        id="label"
        title="Label"
        placeholder="Spring menu (optional)"
      />
      <Form.TextField
        id="theme"
        title="Theme"
        placeholder="Saved theme id or name (optional)"
      />
    </Form>
  );
}
