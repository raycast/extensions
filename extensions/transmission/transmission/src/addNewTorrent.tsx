import { Form, ActionPanel, SubmitFormAction, showToast, ToastStyle, popToRoot } from "@raycast/api";
import { useCallback, useMemo } from "react";
import { createClient } from "./modules/client";

export default function AddNewTorrent() {
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
      <Form.TextField id="downloadDir" placeholder="Download Directory" />
    </Form>
  );
}
