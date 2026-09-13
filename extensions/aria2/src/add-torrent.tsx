import { Action, ActionPanel, Clipboard, Form, LaunchProps, LaunchType, launchCommand, showHUD } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { addSource, downloadDir, ensureAria2, parseSource } from "./lib/aria2";

interface FormValues {
  uri: string;
  torrent: string[];
  downloadDir: string[];
}

export function AddTorrentForm({
  initialUri,
  autoSubmit,
  onAdded,
}: {
  initialUri?: string;
  autoSubmit?: boolean;
  onAdded?: () => void;
}) {
  const [isLoading, setIsLoading] = useState(Boolean(autoSubmit && parseSource(initialUri)));

  const { handleSubmit, itemProps, setValue, setValidationError } = useForm<FormValues>({
    initialValues: {
      uri: initialUri ?? "",
      torrent: [],
      downloadDir: [downloadDir()],
    },
    async onSubmit(values) {
      const uri = values.uri?.trim();
      const torrentPath = values.torrent?.[0];
      const parsed = parseSource(uri) ?? (torrentPath ? ({ kind: "torrent", path: torrentPath } as const) : undefined);
      if (!parsed) {
        setValidationError("uri", "Paste a magnet link, torrent URL, or choose a .torrent file");
        return;
      }

      setIsLoading(true);
      try {
        await ensureAria2();
        await addSource(parsed, values.downloadDir?.[0] || downloadDir());
        await showHUD("Torrent added");
        if (onAdded) {
          onAdded();
        } else {
          await launchCommand({ name: "manage-torrents", type: LaunchType.UserInitiated });
        }
      } catch (error) {
        await showFailureToast(error, { title: "Couldn't add torrent" });
      } finally {
        setIsLoading(false);
      }
    },
  });

  useEffect(() => {
    const input = autoSubmit ? parseSource(initialUri) : undefined;
    if (!input) return;
    let cancelled = false;
    (async () => {
      try {
        await ensureAria2();
        await addSource(input);
        if (cancelled) return;
        await showHUD("Torrent added");
        if (onAdded) onAdded();
        else await launchCommand({ name: "manage-torrents", type: LaunchType.UserInitiated });
      } catch (error) {
        if (!cancelled) {
          await showFailureToast(error, { title: "Couldn't add torrent" });
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoSubmit, initialUri, onAdded]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Torrent" onSubmit={handleSubmit} />
          <Action
            title="Paste from Clipboard"
            shortcut={{ modifiers: ["cmd"], key: "v" }}
            onAction={async () => {
              const text = await Clipboard.readText();
              if (text) setValue("uri", text);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Magnet or URL"
        placeholder="magnet:?xt=urn:btih:… or https://example.com/file.torrent"
        info="Paste a magnet link or a URL to a .torrent file."
        {...itemProps.uri}
      />
      <Form.FilePicker
        title="Torrent File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        info="Alternatively pick a local .torrent file."
        {...itemProps.torrent}
      />
      <Form.FilePicker
        title="Download Folder"
        allowMultipleSelection={false}
        canChooseFiles={false}
        canChooseDirectories
        {...itemProps.downloadDir}
      />
    </Form>
  );
}

export default function Command(
  props: LaunchProps<{ arguments: Arguments.AddTorrent; launchContext: { uri?: string } }>,
) {
  const incoming = props.arguments?.uri || props.fallbackText || props.launchContext?.uri;
  return <AddTorrentForm initialUri={incoming} autoSubmit={Boolean(parseSource(incoming))} />;
}
