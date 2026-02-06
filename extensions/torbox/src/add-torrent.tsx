import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { Clipboard, getSelectedFinderItems } from "@raycast/api";
import { createTorrent } from "./api/torrents";

const detectFinderTorrentFile = async (): Promise<string | null> => {
  try {
    const items = await getSelectedFinderItems();
    const torrent = items.find((item) => item.path.toLowerCase().endsWith(".torrent"));
    return torrent?.path ?? null;
  } catch {
    return null;
  }
};

const detectClipboardMagnet = async (): Promise<string | null> => {
  const text = await Clipboard.readText();
  if (text?.trim().toLowerCase().startsWith("magnet:")) {
    return text.trim();
  }
  return null;
};

export default function AddTorrent() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const [magnet, setMagnet] = useState("");
  const [file, setFile] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [asQueued, setAsQueued] = useState(false);
  const [onlyIfCached, setOnlyIfCached] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const detectInput = async () => {
      const torrentFile = await detectFinderTorrentFile();
      if (torrentFile) {
        setFile([torrentFile]);
        await showToast({
          style: Toast.Style.Success,
          title: "Torrent file detected",
          message: "From Finder selection",
        });
        return;
      }

      const clipboardMagnet = await detectClipboardMagnet();
      if (clipboardMagnet) {
        setMagnet(clipboardMagnet);
        await showToast({ style: Toast.Style.Success, title: "Magnet link detected", message: "From clipboard" });
      }
    };

    detectInput();
  }, []);

  const handleSubmit = async () => {
    const hasMagnet = magnet.trim().length > 0;
    const hasFile = file.length > 0;

    if (!hasMagnet && !hasFile) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing input",
        message: "Provide a magnet link or torrent file",
      });
      return;
    }

    if (hasMagnet && !magnet.trim().toLowerCase().startsWith("magnet:")) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid magnet link", message: "Must start with magnet:" });
      return;
    }

    setIsLoading(true);

    try {
      await showToast({ style: Toast.Style.Animated, title: "Adding torrent..." });

      await createTorrent(preferences.apiKey, {
        magnet: hasFile ? undefined : magnet.trim(),
        file: hasFile ? file[0] : undefined,
        name: name.trim() || undefined,
        asQueued,
        onlyIfCached,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Torrent added",
        message: name.trim() || (hasFile ? "From file" : "From magnet"),
      });

      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add torrent",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Torrent" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="magnet"
        title="Magnet Link"
        placeholder="magnet:?xt=urn:btih:..."
        value={magnet}
        onChange={setMagnet}
      />

      <Form.FilePicker
        id="file"
        title="Torrent File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles={true}
        value={file}
        onChange={setFile}
      />

      <Form.Separator />

      <Form.TextField id="name" title="Custom Name" placeholder="Optional" value={name} onChange={setName} />

      <Form.Checkbox id="asQueued" label="Add to queue" value={asQueued} onChange={setAsQueued} />

      <Form.Checkbox id="onlyIfCached" label="Only if cached" value={onlyIfCached} onChange={setOnlyIfCached} />
    </Form>
  );
}
