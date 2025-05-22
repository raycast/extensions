import { getPreferenceValues, showToast, Toast, Form, ActionPanel, Action, getSelectedFinderItems } from "@raycast/api";
import { AddTorrentOptions, QBittorrent, Preferences as QbittorrentPreferences } from "@ctrl/qbittorrent";
import { useEffect, useRef, useState, useMemo } from "react";
import { readFile } from "node:fs/promises";

interface Values extends AddTorrentOptions {
  torrentPaths: string[];
  urls: string;
}

export default function AddTorrents() {
  const { address, username, password } = getPreferenceValues<Preferences.AddTorrents>();
  const qbit = useMemo(() => {
    return new QBittorrent({
      baseUrl: address,
      username,
      password,
    });
  }, [address, username, password]);

  const torrentFilesRef = useRef<Form.TagPicker>(null);
  const torrentURLsRef = useRef<Form.TextArea>(null);
  const [selectedTorrents, setSelectedTorrents] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<QbittorrentPreferences>();
  const [categories, setCategories] = useState<string[]>();

  const prefillTorrentFilePaths = async () => {
    try {
      const selectedItems = await getSelectedFinderItems();
      setSelectedTorrents(selectedItems.map((item) => item.path));
      await showToast({
        style: Toast.Style.Success,
        title: `Detected ${selectedItems.length} Torrents from Finder`,
        message: "Please select the torrents that wants to submit.",
      });
    } catch (error) {
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
      setCategories(Object.keys(categories));
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
  }, []);

  const submitTorrents = async (values: Values) => {
    const { torrentPaths, urls: urlString, ...opts } = values;
    const urls = urlString
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter(Boolean);
    const localTorrents = await Promise.all(torrentPaths.map((path) => readFile(path)));

    if (!localTorrents.length && !urls.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to submit torrents",
        message: "Please select torrents or fill some urls.",
      });
      return;
    }
    setLoading(true);
    const options = Object.fromEntries(Object.entries(opts).filter(([, value]) => value !== ""));
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
    setLoading(false);
    await showToast({
      style: Toast.Style.Success,
      title: "Added torrents successfully",
    });
    torrentFilesRef.current?.reset();
    torrentURLsRef.current?.reset();
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
      <Form.TagPicker
        ref={torrentFilesRef}
        placeholder="Torrent paths"
        id="torrentPaths"
        title="Torrent Files"
        info="list torrents that selected in Finder"
      >
        {selectedTorrents.map((torrentPath) => (
          <Form.TagPicker.Item value={torrentPath} title={torrentPath} key={torrentPath} />
        ))}
      </Form.TagPicker>
      <Form.TextArea
        ref={torrentURLsRef}
        title="Torrent URLs"
        id="urls"
        placeholder="torrent URLs (http://, https://, magnet: and bc://bt/)"
      />
      <Form.Separator />
      <Form.Checkbox label="Skip Checking" id="skip_checking" defaultValue={false}></Form.Checkbox>
      <Form.Checkbox label="Paused" id="paused" defaultValue={false}></Form.Checkbox>
      {preferences?.save_path && (
        <Form.TextField title="Save Path" id="savepath" defaultValue={preferences?.save_path} />
      )}
      <Form.TextField title="Rename Torrent" id="rename" placeholder="Rename Torrent" />
      <Form.Dropdown id="category" title="Category" defaultValue="">
        <Form.Dropdown.Item value="" title="No Category" />
        {categories?.map((category) => <Form.Dropdown.Item value={category} title={category} key={category} />)}
      </Form.Dropdown>
      <Form.TextField title="Limit Download Rate" id="dlLimit" placeholder="KiB/s" />
      <Form.TextField title="Limit Upload Rate" id="upLimit" placeholder="KiB/s" />
    </Form>
  );
}
