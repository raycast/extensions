import { Action, ActionPanel, Icon, List, Toast, open, showToast } from "@raycast/api";
import { useMemo, useState } from "react";
import { useSchedulingLinks } from "./hooks/useSchedulingLinks";
import { useUser } from "./hooks/useUser";
import { SchedulingLink } from "./types/scheduling-link";
import { axiosPromiseData, fetcher } from "./utils/axiosPromise";
import { resolveTimePolicy } from "./utils/time-policy";

const SLActions = ({ link }: { link: SchedulingLink }) => {
  const url = `https://app.reclaim.ai/m/${link.pageSlug}/${link.slug}`;
  const { currentUser } = useUser();

  const shareTimesEnabled = useMemo(() => {
    return !!currentUser?.features.schedulingLinks.shareTimesEnabled;
  }, [currentUser]);

  const createOneOffLink = async () => {
    const [oneOff, error] = await axiosPromiseData<SchedulingLink>(
      fetcher("/scheduling-link/derivative", {
        method: "POST",
        data: {
          parentId: link.id,
        },
      })
    );

    if (!error && oneOff) {
      open(`https://app.reclaim.ai/scheduling-links?personalize=${oneOff.id}`);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error creating one-off link. Try using the reclaim.ai web app.",
      });
    }
  };

  const createShareLink = async () => {
    open(`https://app.reclaim.ai/quick-forms/scheduling-links/${link.id}/available-times`);
  };

  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Link to Clipboard" content={url} />
      {shareTimesEnabled && <Action icon={Icon.AddPerson} title="Personalize and Share" onAction={createShareLink} />}
      {!shareTimesEnabled && <Action icon={Icon.AddPerson} title="Create One Off Link" onAction={createOneOffLink} />}
      <Action.Open title="Open in Browser" target={url} />
    </ActionPanel>
  );
};

const ListDetailMetadataField = ({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description?: string;
}) => (
  <>
    <List.Item.Detail.Metadata.Label title={title} />
    <List.Item.Detail.Metadata.Label title={value} text={description} />
    <List.Item.Detail.Metadata.Separator />
  </>
);

export default function Command() {
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
                              <ListDetailMetadataField title="Hours:" value={hours} />
                              <ListDetailMetadataField title="Organizers:" value={organizers} />
                              <ListDetailMetadataField title="Duration:" value={duration} />
                              {sl.priority === "HIGH" && (
                                <ListDetailMetadataField title="Priority:" value="High Priority" />
                              )}
                            </List.Item.Detail.Metadata>
                          );
                        })()}
                      />
                    }
                    actions={<SLActions link={sl} />}
                  />
                ))}
            </List.Section>
          ))}
      </>
    </List>
  );
}
