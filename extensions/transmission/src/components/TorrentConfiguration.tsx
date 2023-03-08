import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useMutateTorrent, useTorrent } from "../modules/client";
import { BandwidthPriority, Torrent } from "../types";

export const TorrentConfiguration = ({ id }: { id: Torrent["id"] }) => {
  const { data: torrent } = useTorrent({ id });
  const mutateTorrent = useMutateTorrent();

  const { pop } = useNavigation();

  return (
    <Form
      isLoading={torrent == null}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Back to torrents list" onSubmit={pop} />
        </ActionPanel>
      }
    >
      {torrent != null && (
        <>
          <Form.Description title="" text="Priority" />
          <Form.Dropdown
            id="bandwidthPriority"
            title="Transfer Priority"
            value={String(torrent.bandwidthPriority)}
            onChange={async (priority) => {
              await mutateTorrent.update(torrent.id, {
                bandwidthPriority: Number(priority),
              });
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
            value={torrent.downloadLimited}
            onChange={async (downloadLimited) => {
              if (downloadLimited === torrent.downloadLimited) return;

              await mutateTorrent.update(torrent.id, {
                downloadLimited,
              });
            }}
          />
          <Form.TextField
            id="downloadLimit"
            title="kB/s"
            value={String(torrent.downloadLimit)}
            onChange={async (downloadLimit) => {
              await mutateTorrent.update(torrent.id, {
                downloadLimit: Number(downloadLimit),
              });
            }}
          />
          <Form.Checkbox
            id="limitUploadEnabled"
            title="Limit Upload"
            label="Enabled"
            value={torrent.uploadLimited}
            onChange={async (uploadLimited) => {
              await mutateTorrent.update(torrent.id, {
                uploadLimited,
              });
            }}
          />
          <Form.TextField
            id="limitUpload"
            title="kB/s"
            value={String(torrent.uploadLimit)}
            onChange={async (uploadLimit) => {
              await mutateTorrent.update(torrent.id, {
                uploadLimit: Number(uploadLimit),
              });
            }}
          />
        </>
      )}
    </Form>
  );
};
