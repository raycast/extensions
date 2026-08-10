import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import { getDownloadItemIcon, getFileSizeOrQuality } from "./utils";
import { DownloadView, DownloadActions } from "./components";
import { usePromise } from "@raycast/utils";
import { requestDownloads } from "./api";

export const Downloads = () => {
  const { push } = useNavigation();
  const { data, isLoading, revalidate } = usePromise(requestDownloads);
  const [showingDetail] = useState(false);

  return (
    <List isLoading={isLoading} isShowingDetail={showingDetail}>
      {data &&
        data.map((download) => {
          return (
            <List.Item
              key={download.id}
              title={download?.filename}
              accessories={[
                { text: getFileSizeOrQuality(download) },
                {
                  icon: getDownloadItemIcon(download),
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      icon={Icon.Info}
                      title="Show More Details"
                      onAction={() => push(<DownloadView downloadItem={download} revalidate={revalidate} />)}
                    />
                  </ActionPanel.Section>
                  <DownloadActions downloadItem={download} revalidate={revalidate} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
};

export default Downloads;
