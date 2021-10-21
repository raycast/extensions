import {
  Form,
  ActionPanel,
  SubmitFormAction,
  showToast,
  ToastStyle,
  popToRoot,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useCallback, useMemo } from "react";
import { createClient } from "./modules/client";

const preferences = getPreferenceValues();

export default function AddNewTorrent() {
  const [downloadDir, setDownloadDir] = useState("");
  const transmission = useMemo(() => createClient(), []);

  const handleSubmit = useCallback(async (values: { url: string; downloadDir: string }) => {
    try {
      await transmission.addUrl(values.url, {
        "download-dir": values.downloadDir,
      });

      showToast(ToastStyle.Success, `Torrent added to your list`);
    } catch (error) {
      showToast(ToastStyle.Failure, `The torrent couldn't be added`);
    } finally {
      popToRoot({ clearSearchBar: true });
    }
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Add Torrent" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" placeholder="Magnet Link" />
      <Form.Dropdown id="quickPath" onChange={setDownloadDir}>
        <Form.Dropdown.Item value="" title="Choose an option, or type below" />
        {preferences.quickPaths
          .split(",")
          .map((path: string) => path.trim())
          .map((path: string, index: number) => (
            <Form.Dropdown.Item key={index} value={path} title={path} />
          ))}
      </Form.Dropdown>
      <Form.TextField id="downloadDir" placeholder="Download Directory" value={downloadDir} onChange={setDownloadDir} />
    </Form>
  );
}
