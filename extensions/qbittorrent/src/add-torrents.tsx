import {
  getPreferenceValues,
  showToast,
  Toast,
  Form,
  ActionPanel,
  Action,
  getSelectedFinderItems,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import {
  AddTorrentOptions,
  QBittorrent,
  Preferences as QbittorrentPreferences,
  TorrentCategories,
} from "@ctrl/qbittorrent";
import { useEffect, useMemo, useRef, useState } from "react";
import { readFile } from "node:fs/promises";

interface Values {
  torrentPaths: string[];
  urls: string;
  skip_checking: boolean;
  paused: boolean;
  savepath: string;
  rename: string;
  category: string;
  dlLimit: string;
  upLimit: string;
}

const torrentFileRegex = /\.torrent$/i;

function parseKiBPerSecond(value: string): number | undefined {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return undefined;
  }

  const parsedValue = Number(trimmedValue);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return undefined;
  }

  return Math.round(parsedValue * 1024);
}

export default function AddTorrents() {
  const { address, username, password, redirectAfterAdding } = getPreferenceValues<Preferences.AddTorrents>();
  const qbit = useMemo(() => {
    return new QBittorrent({
      baseUrl: address,
      username,
      password,
    });
  }, [address, username, password]);

  const torrentFilesRef = useRef<Form.FilePicker>(null);
  const torrentURLsRef = useRef<Form.TextArea>(null);
  const [selectedTorrents, setSelectedTorrents] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<QbittorrentPreferences>();
  const [categories, setCategories] = useState<TorrentCategories>({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [savePath, setSavePath] = useState("");

  const prefillTorrentFilePaths = async () => {
    try {
      const selectedItems = await getSelectedFinderItems();
      const torrentPaths = selectedItems.map((item) => item.path).filter((itemPath) => torrentFileRegex.test(itemPath));

      if (!torrentPaths.length) {
        return;
      }

      setSelectedTorrents(torrentPaths);
      await showToast({
        style: Toast.Style.Success,
        title: `Detected ${torrentPaths.length} Torrent File${torrentPaths.length === 1 ? "" : "s"} from Finder`,
        message: "The file picker was prefilled with your current Finder selection.",
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Finder isn't the frontmost application")) {
        return;
      }

      console.log(error);
    }
  };

  const loginAndInitPreferences = async () => {
    setLoading(true);
    try {
      await qbit.login();
      const preferences = await qbit.getPreferences();
      const categories = await qbit.getCategories();
      setPreferences(preferences);
      setCategories(categories);
      setSavePath(preferences.save_path);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to connect to qBittorrent",
        message: "Please check your Web UI settings and make sure qBittorrent is running.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loginAndInitPreferences();
    prefillTorrentFilePaths();
  }, [qbit]);

  const updateCategory = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setSavePath(
      categoryName
        ? (categories[categoryName]?.savePath ?? preferences?.save_path ?? "")
        : (preferences?.save_path ?? ""),
    );
  };

  const submitTorrents = async (values: Values) => {
    const {
      torrentPaths,
      urls: urlString,
      skip_checking,
      paused,
      savepath,
      rename,
      category,
      dlLimit,
      upLimit,
    } = values;
    const urls = urlString
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter(Boolean);
    const parsedDownloadLimit = parseKiBPerSecond(dlLimit);
    const parsedUploadLimit = parseKiBPerSecond(upLimit);

    if (!torrentPaths.length && !urls.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to submit torrents",
        message: "Select one or more torrent files, or paste at least one URL.",
      });
      return;
    }

    if ((dlLimit.trim() && parsedDownloadLimit === undefined) || (upLimit.trim() && parsedUploadLimit === undefined)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid rate limit",
        message: "Download and upload limits must be numeric KiB/s values.",
      });
      return;
    }

    setLoading(true);
    const options: Partial<AddTorrentOptions> = {};

    if (skip_checking) {
      options.skip_checking = "true";
    }

    if (paused) {
      options.paused = "true";
    }

    if (savepath.trim()) {
      options.savepath = savepath.trim();
    }

    if (rename.trim()) {
      options.rename = rename.trim();
    }

    if (category) {
      options.category = category;
    }

    if (parsedDownloadLimit !== undefined) {
      options.dlLimit = parsedDownloadLimit;
    }

    if (parsedUploadLimit !== undefined) {
      options.upLimit = parsedUploadLimit;
    }

    try {
      const localTorrents = await Promise.all(torrentPaths.map((path) => readFile(path)));

      await qbit.login();

      await Promise.all(
        localTorrents.map((torrent) => {
          return qbit.addTorrent(torrent, options);
        }),
      );
      await Promise.all(
        urls.map((magnet) => {
          return qbit.addMagnet(magnet, options);
        }),
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Added torrents successfully",
      });
      setSelectedTorrents([]);
      torrentFilesRef.current?.reset();
      torrentURLsRef.current?.reset();

      if (redirectAfterAdding) {
        try {
          await launchCommand({
            name: "torrents",
            type: LaunchType.UserInitiated,
          });
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to open torrents",
            message: error instanceof Error ? error.message : "Unknown error occurred",
          });
        }
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add torrents",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Torrents" onSubmit={submitTorrents} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        ref={torrentFilesRef}
        allowMultipleSelection
        id="torrentPaths"
        title="Torrent Files"
        info="Pick .torrent files directly, or prefill from the current Finder selection."
        value={selectedTorrents}
        onChange={setSelectedTorrents}
      />
      <Form.TextArea
        ref={torrentURLsRef}
        title="Torrent URLs"
        id="urls"
        placeholder="torrent URLs (http://, https://, magnet: and bc://bt/)"
      />
      <Form.Separator />
      <Form.Checkbox label="Skip Checking" id="skip_checking" defaultValue={false}></Form.Checkbox>
      <Form.Checkbox label="Paused" id="paused" defaultValue={false}></Form.Checkbox>
      <Form.TextField title="Save Path" id="savepath" value={savePath} onChange={setSavePath} />
      <Form.TextField title="Rename Torrent" id="rename" placeholder="Rename Torrent" />
      <Form.Dropdown id="category" title="Category" value={selectedCategory} onChange={updateCategory}>
        <Form.Dropdown.Item value="" title="No Category" />
        {Object.keys(categories).map((category) => (
          <Form.Dropdown.Item value={category} title={category} key={category} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Limit Download Rate" id="dlLimit" placeholder="KiB/s" />
      <Form.TextField title="Limit Upload Rate" id="upLimit" placeholder="KiB/s" />
    </Form>
  );
}
