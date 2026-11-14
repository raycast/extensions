import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { homedir } from "node:os";
import { useState } from "react";
import { LinkPreview } from "./components/LinkPreview";
import { useLinkPreview } from "./hooks/useLinkPreview";
import { getState } from "./lib/api";
import { startLinkDownload } from "./lib/commands";
import { defaultDownloadDir, extractSoundCloudLink, outputDirOverride, shortenHome } from "./lib/downloadLink";
import { reportLoadError } from "./lib/feedback";

const HOME = homedir();

async function readClipboardLink(): Promise<string | undefined> {
  return extractSoundCloudLink(await Clipboard.readText());
}

function submitBlockedReason({ error, isLoading }: { error?: string; isLoading: boolean }): string {
  if (error) return error;
  return isLoading ? "Still checking the link…" : "Paste a SoundCloud link first";
}

export default function DownloadLink() {
  const clipboard = usePromise(readClipboardLink);
  const appState = usePromise(getState, [], { onError: (error) => reportLoadError(error, "download-link") });
  const [typedLink, setTypedLink] = useState<string>();
  const [pickedDirs, setPickedDirs] = useState<string[]>();

  const link = typedLink ?? clipboard.data ?? "";
  const preview = useLinkPreview(link);
  const appDownloadPath = appState.data?.downloadPath ?? "";
  const destination = pickedDirs?.[0] ?? defaultDownloadDir(appDownloadPath, HOME);

  async function handleSubmit() {
    if (!preview.resolved) {
      await showToast({ style: Toast.Style.Failure, title: submitBlockedReason(preview) });
      return;
    }
    const outputDir = outputDirOverride(destination, appDownloadPath, HOME);
    await startLinkDownload(preview.resolved, outputDir, shortenHome(destination, HOME));
  }

  return (
    <Form
      isLoading={clipboard.isLoading || appState.isLoading || preview.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Download" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="link"
        title="SoundCloud Link"
        placeholder="https://soundcloud.com/…"
        value={link}
        onChange={setTypedLink}
        error={preview.error}
      />
      <LinkPreview link={preview.resolved} />
      <Form.Separator />
      <Form.FilePicker
        id="folder"
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        value={[destination]}
        onChange={setPickedDirs}
      />
      <Form.Description title="Destination" text={shortenHome(destination, HOME)} />
    </Form>
  );
}
