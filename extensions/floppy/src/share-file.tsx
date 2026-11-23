import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  getSelectedFinderItems,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import type { Expiry } from "./lib/api";
import { bytes, shortUrl } from "./lib/format";
import { shareFiles, type Shared } from "./lib/upload";
import { ReadersView } from "./components/readers";

type Values = { files: string[]; label: string; expiry: string };

const EXPIRIES: { value: Expiry | ""; title: string }[] = [
  { value: "", title: "Your default" },
  { value: "1D", title: "1 day" },
  { value: "3D", title: "3 days" },
  { value: "1W", title: "1 week" },
  { value: "2W", title: "2 weeks" },
  { value: "1M", title: "1 month" },
  { value: "3M", title: "3 months" },
  { value: "NEVER", title: "Never" },
];

export default function ShareFile() {
  const [files, setFiles] = useState<string[]>([]);
  const [shared, setShared] = useState<Shared | null>(null);
  const [busy, setBusy] = useState(false);

  // Start from whatever is selected in Finder
  useEffect(() => {
    getSelectedFinderItems()
      .then((items) => setFiles(items.map((i) => i.path)))
      .catch(() => undefined);
  }, []);

  if (shared) return <SharedView shared={shared} />;

  async function submit(v: Values) {
    if (!v.files.length) {
      await showToast({ style: Toast.Style.Failure, title: "Pick a file to share" });
      return;
    }
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Sharing", message: "0%" });
    try {
      const out = await shareFiles(v.files, {
        label: v.label,
        expiry: (v.expiry || undefined) as Expiry | undefined,
        onProgress: (f) => {
          toast.message = `${Math.round(f * 100)}%`;
        },
      });
      await Clipboard.copy(out.url);
      toast.style = Toast.Style.Success;
      toast.title = `Copied ${shortUrl(out.url)}`;
      toast.message = out.label ? `Only for ${out.label}` : undefined;
      setShared(out);
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't share it";
      toast.message = e instanceof Error ? e.message : String(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Share and Copy Link" icon={Icon.Link} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Files"
        value={files}
        onChange={setFiles}
        allowMultipleSelection
        canChooseDirectories={false}
        info="Several files become one link."
      />
      <Form.TextField
        id="label"
        title="For"
        placeholder="Optional: who it's for, e.g. Sequoia – Jane"
        info="Gives this person their own URL, so you see exactly what they read."
      />
      <Form.Dropdown id="expiry" title="Expires" defaultValue="">
        {EXPIRIES.map((e) => (
          <Form.Dropdown.Item key={e.value} value={e.value} title={e.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function SharedView({ shared }: { shared: Shared }) {
  const { link, url, label } = shared;
  const markdown = `# Copied ${shortUrl(url)}

**${link.name}** is a link now${label ? `, only for **${label}**` : ""}. Paste it anywhere: you'll see who opens it, page by page.

It opens for others once the malware check passes, usually in a few seconds.`;
  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Link" text={shortUrl(url)} target={url} />
          <Detail.Metadata.Label title="File" text={link.name} />
          <Detail.Metadata.Label title="Size" text={bytes(link.size)} />
          <Detail.Metadata.Label
            title="Expires"
            text={link.expires_at ? new Date(link.expires_at).toLocaleString() : "Never"}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Link" content={url} />
          <Action.OpenInBrowser url={url} />
          <Action.Push
            title="Who Read It"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            target={<ReadersView linkId={link.id} name={link.name} url={url} />}
          />
          <Action.Paste title="Paste Link" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "v" }} />
        </ActionPanel>
      }
    />
  );
}
