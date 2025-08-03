import { getAnnouncements } from "@/service/announcements";
import { ActionPanel, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import TurndownService from "turndown";

const turndownService = new TurndownService();

function AnnouncementsList() {
  const { data, isLoading } = usePromise(() => getAnnouncements(), [], {
    failureToastOptions: {
      title: "Error fetching announcements",
    },
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search announcements..."
      selectedItemId={selectedId || undefined}
      onSelectionChange={setSelectedId}
      isShowingDetail
    >
      {data?.map((announcement) => (
        <List.Item
          key={announcement.title + announcement.publication_start_time}
          id={announcement.title + announcement.publication_start_time}
          title={announcement.title}
          detail={
            <List.Item.Detail
              markdown={`# ${announcement.title}\n\n${turndownService.turndown(announcement.info)}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Transport" text={announcement.transport} />
                  <List.Item.Detail.Metadata.Label title="Routes" text={announcement.routes} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={<ActionPanel />}
        />
      ))}
    </List>
  );
}

export default function Command() {
  return <AnnouncementsList />;
}
