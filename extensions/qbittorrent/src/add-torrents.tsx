import { getPreferenceValues, showToast, Toast, Form, ActionPanel, Action, getSelectedFinderItems } from "@raycast/api";
import { QBittorrent, RawPreference } from "qbit.js";
import { useEffect, useRef, useState } from "react";

interface Preferences {
  address: string;
  username: string;
  password: string;
  timeout: number;
}

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

export default function AddTorrents() {
  const { address, username, password } = getPreferenceValues<Preferences>();
  const qbit = new QBittorrent(address);

  const torrentFilesRef = useRef<Form.TagPicker>(null);
  const torrentURLsRef = useRef<Form.TextArea>(null);
  const [selectedTorrents, setSelectedTorrents] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<RawPreference>();
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
    await qbit.login(username, password);
    const preferences = await qbit.api.getPreferences();
    const categories = await qbit.api.getCategories();
    setPreferences(preferences);
    setCategories(Object.keys(categories));
    setLoading(false);
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
    const torrents = [...torrentPaths, ...urls];
    if (!torrents.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to submit torrents",
        message: "Please select torrents or fill some urls.",
      });
      return;
    }
    setLoading(true);
    const options = Object.fromEntries(Object.entries(opts).filter(([_, value]) => value !== ""));
    await qbit.login(username, password);
    await qbit.api.addTorrent(torrents, options);
    setLoading(false);
    await showToast({
      style: Toast.Style.Success,
      title: "Add torrents successfully",
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
        {categories?.map((category) => (
          <Form.Dropdown.Item value={category} title={category} key={category} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Limit Download Rate" id="dlLimit" placeholder="KiB/s" />
      <Form.TextField title="Limit Upload Rate" id="upLimit" placeholder="KiB/s" />
    </Form>
  );
}
