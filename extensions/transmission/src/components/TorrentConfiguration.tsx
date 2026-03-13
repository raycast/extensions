import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useMutateTorrent, useTorrent } from "../modules/client";
import { BandwidthPriority, Torrent } from "../types";

export const TorrentConfiguration = ({ id }: { id: Torrent["id"] }) => {
  const { data: torrent } = useTorrent({ id });
  const { pop } = useNavigation();

  const mutateTorrent = useMutateTorrent();

  return (
    <Form
      isLoading={torrent == null}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Back to Torrents List" onSubmit={pop} />
        </ActionPanel>
      }
    >
      {torrent ? (
        <>
          <Form.Description title="" text="Priority" />
          <Form.Dropdown
            id="bandwidthPriority"
            title="Transfer Priority"
            value={torrent.bandwidthPriority.toString()}
            onChange={async (priority) => {
              if (priority === torrent.bandwidthPriority.toString()) return;
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
            onChange={(downloadLimited) => {
              if (downloadLimited === torrent.downloadLimited) return;
              mutateTorrent.update(torrent.id, {
                downloadLimited,
              });
            }}
          />
          <Form.TextField
            id="downloadLimit"
            title="kB/s"
            value={torrent.downloadLimit.toString()}
            onChange={(downloadLimit) => {
              if (downloadLimit === torrent.downloadLimit.toString()) return;
              mutateTorrent.update(torrent.id, {
                downloadLimit: Number(downloadLimit),
              });
            }}
          />
          <Form.Checkbox
            id="limitUploadEnabled"
            title="Limit Upload"
            label="Enabled"
            value={torrent.uploadLimited}
            onChange={(uploadLimited) => {
              if (uploadLimited === torrent.uploadLimited) return;
              mutateTorrent.update(torrent.id, {
                uploadLimited,
              });
            }}
          />
          <Form.TextField
            id="limitUpload"
            title="kB/s"
            value={torrent.uploadLimit.toString()}
            onChange={async (uploadLimit) => {
              if (uploadLimit === torrent.uploadLimit.toString()) return;
              mutateTorrent.update(torrent.id, {
                uploadLimit: Number(uploadLimit),
              });
            }}
          />
        </>
      ) : null}
    </Form>
  );
};
