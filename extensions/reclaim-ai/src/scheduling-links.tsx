import "./initSentry";

import { Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { ListItemDetailMetadataField } from "./components/ListItemDetailMetadataField";
import { withRAIErrorBoundary } from "./components/RAIErrorBoundary";
import { SchedulingLinkActionPanel } from "./components/SchedulingLinkActionPanel";
import { useSchedulingLinks } from "./hooks/useSchedulingLinks";
import { useUser } from "./hooks/useUser";
import { resolveTimePolicy } from "./utils/time-policy";

function Command() {
  const [searchText, setSearchText] = useState("");

  const { schedulingLinks, schedulingLinksIsLoading, schedulingLinksGroups, schedulingLinksGroupsIsLoading } =
    useSchedulingLinks();

  const isLoading = schedulingLinksIsLoading || schedulingLinksGroupsIsLoading;

  const { links, groups } = useMemo(
    () =>
      !schedulingLinks || !schedulingLinksGroups
        ? { links: [], groups: [] }
        : {
            links: schedulingLinks,
            groups: schedulingLinksGroups,
          },
    [schedulingLinks, schedulingLinksGroups]
  );

  const { currentUser } = useUser();

  return (
    <List
      isLoading={isLoading}
      filtering={true}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Scheduling Links"
      isShowingDetail
    >
      <>
        {!!links.length &&
          groups.map((group) => (
            <List.Section key={group.id} title={group.name}>
              {links
                .filter((sl) => group.linkIds.find((id) => id === sl.id))
                .map((sl) => (
                  <List.Item
                    key={sl.id}
                    title={sl.title}
                    icon={{
                      source: Icon.Calendar,
                    }}
                    detail={
                      <List.Item.Detail
                        metadata={(() => {
                          const organizers = sl.organizers.map((o) => o.organizer.name).join(", ");

                          const duration = sl.durations.join(", ");

                          const timePolicy = sl.organizers.find(
                            (o) => o.organizer.userId === currentUser?.id
                          )?.timePolicyType;

                          const hours = timePolicy ? resolveTimePolicy(timePolicy) : "Unknown";

                          return (
                            <List.Item.Detail.Metadata>
                              <ListItemDetailMetadataField title="Hours:" value={hours} />
                              <ListItemDetailMetadataField title="Organizers:" value={organizers} />
                              <ListItemDetailMetadataField title="Duration:" value={duration} />
                              {sl.priority === "HIGH" && (
                                <ListItemDetailMetadataField title="Priority:" value="High Priority" />
                              )}
                            </List.Item.Detail.Metadata>
                          );
                        })()}
                      />
                    }
                    actions={<SchedulingLinkActionPanel link={sl} />}
                  />
                ))}
            </List.Section>
          ))}
      </>
    </List>
  );
}

export default withRAIErrorBoundary(Command);
