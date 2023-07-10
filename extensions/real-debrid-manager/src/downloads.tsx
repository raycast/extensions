import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useDownloads } from "./hooks";
import { useState } from "react";
import { getFileSizeOrQuality, parseFileType } from "./utils";
import { DownloadView, DownloadActions } from "./components";

export const Downloads = () => {
  const { getDownloads } = useDownloads();
  const { push } = useNavigation();
  const { data, isLoading, revalidate } = getDownloads();
  const [showingDetail] = useState(false);

  return (
    <List isLoading={isLoading} isShowingDetail={showingDetail}>
      {data &&
        data.map((download) => {
          return (
            <List.Item
              key={download.id}
              title={download?.filename}
              subtitle={parseFileType(download)}
              accessories={[{ text: getFileSizeOrQuality(download) }]}
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
