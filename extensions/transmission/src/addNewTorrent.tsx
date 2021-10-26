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
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import expandTidle from "expand-tilde";
import { createClient } from "./modules/client";

const preferences = getPreferenceValues();

export default function AddNewTorrent() {
  const [downloadDir, setDownloadDir] = useState("");
  const transmission = useMemo(() => createClient(), []);

  const handleSubmit = useCallback(async (values: { url: string; downloadDir: string }) => {
    try {
      await transmission.addUrl(values.url, {
        "download-dir": expandTidle(values.downloadDir),
      });

      showToast(ToastStyle.Success, `Torrent added to your list`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      showToast(ToastStyle.Failure, `The torrent couldn't be added: ${error.code}`);
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
      <Form.TextField title="Magnet Link" id="url" placeholder="magnet:" />
      <Form.Dropdown title="Quickly insert a path" id="quickPath" onChange={setDownloadDir}>
        <Form.Dropdown.Item value="" title="" />
        {preferences.quickPaths
          .split(",")
          .map((path: string) => path.trim())
          .map((path: string, index: number) => (
            <Form.Dropdown.Item key={index} value={path} title={path} />
          ))}
      </Form.Dropdown>
      <Form.TextField title="Download Directory" id="downloadDir" value={downloadDir} onChange={setDownloadDir} />
    </Form>
  );
}
