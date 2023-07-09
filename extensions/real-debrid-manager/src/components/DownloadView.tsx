import { ActionPanel, Detail } from "@raycast/api";
import { DownloadFileData } from "../schema";
import { readDownloadDetails } from "../utils";
import { DownloadActions } from ".";

interface DownloadViewProps {
  downloadItem: DownloadFileData;
  revalidate: () => void;
}

export const DownloadView: React.FC<DownloadViewProps> = ({ downloadItem, revalidate }) => {
  return (
    <Detail
      markdown={readDownloadDetails(downloadItem)}
      actions={
        <ActionPanel>
          <DownloadActions downloadItem={downloadItem} revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
};

export default DownloadView;
