import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useMemo } from "react";
import { createClient } from "../modules/client";
import { BandwidthPriority, Torrent } from "../types";

export const TorrentConfiguration = ({
  torrent,
  updateData,
}: {
  torrent: Torrent;
  updateData: () => Promise<void>;
}) => {
  const transmission = useMemo(() => createClient(), []);

  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Back to torrents list" onSubmit={pop} />
        </ActionPanel>
      }
    >
      <Form.Description title="" text="Priority" />
      <Form.Dropdown
        id="bandwidthPriority"
        title="Transfer Priority"
        defaultValue={String(BandwidthPriority[torrent.bandwidthPriority])}
        onChange={async (priority) => {
          if (Number(priority) === torrent.bandwidthPriority) return;

          await transmission.set(torrent.id, {
            bandwidthPriority: Number(priority),
          });
          await updateData();
        }}
      >
        <Form.Dropdown.Item value={String(BandwidthPriority.High)} title="High" icon={Icon.ChevronUp} />
        <Form.Dropdown.Item value={String(BandwidthPriority.Normal)} title="Normal" icon={Icon.Circle} />
        <Form.Dropdown.Item value={String(BandwidthPriority.Low)} title="Low" icon={Icon.ChevronDown} />
      </Form.Dropdown>
      <Form.Description title="" text="" />
      <Form.Description title="" text="Transfer Bandwidth" />
      <Form.Checkbox
        id="downloadLimited"
        title="Limit Download"
        label="Enabled"
        onChange={async (downloadLimited) => {
          if (downloadLimited === torrent.downloadLimited) return;

          await transmission.set(torrent.id, {
            downloadLimited,
          });
          await updateData();
        }}
      />
      <Form.TextField
        id="downloadLimit"
        title="kB/s"
        defaultValue={String(torrent.downloadLimit)}
        onChange={async (downloadLimit) => {
          if (Number(downloadLimit) === torrent.downloadLimit) return;

          await transmission.set(torrent.id, {
            downloadLimit: Number(downloadLimit),
          });
          await updateData();
        }}
      />
      <Form.Checkbox
        id="limitUploadEnabled"
        title="Limit Upload"
        label="Enabled"
        onChange={async (uploadLimited) => {
          if (uploadLimited === torrent.uploadLimited) return;

          await transmission.set(torrent.id, {
            uploadLimited,
          });
          await updateData();
        }}
      />
      <Form.TextField
        id="limitUpload"
        title="kB/s"
        defaultValue={String(torrent.uploadLimit)}
        onChange={async (uploadLimit) => {
          if (Number(uploadLimit) === torrent.uploadLimit) return;

          await transmission.set(torrent.id, {
            uploadLimit: Number(uploadLimit),
          });
          await updateData();
        }}
      />
    </Form>
  );
};
