import { useMemo } from "react";
import { ActionPanel, Clipboard, Color, Detail, Icon, List } from "@raycast/api";

import { ActivityActions } from "./components/activity";
import { useDebouncedState } from "./hooks";
import { Activity } from "./services";
import { isNil, toMarkdown } from "./utils";

export type ActivityDetailProps = { activities: Activity[] };

export default function ActivityDetail({ activities }: ActivityDetailProps) {
  const [, debouncedSearchValue, setSearchValue] = useDebouncedState("");

  const filteredActivities = useMemo(() => {
    if (isNil(debouncedSearchValue)) {
      return activities;
    }

    const searchQuery = debouncedSearchValue.toLowerCase();
    return activities.filter(
      (x) =>
        x.email.toLowerCase().includes(searchQuery) ||
        x.name.toLowerCase().includes(searchQuery) ||
        x.company.toLowerCase().includes(searchQuery) ||
        x.projectName.toLowerCase().includes(searchQuery)
    );
  }, [activities, debouncedSearchValue]);

  return (
    <List isShowingDetail onSearchTextChange={setSearchValue}>
      {filteredActivities?.map((activity, index) => (
        <List.Item
          key={index}
          title={activity.projectName}
          accessories={[{ text: `${activity.date} ${activity.time}` }]}
          detail={
            <List.Item.Detail
              markdown={toMarkdown([
                {
                  h2: "Confirmation",
                  blockquote: [
                    `**${activity.responsibleMail}** on ${activity.confirmDate}`,
                    `> ${activity.description}`,
                  ],
                },
              ])}
              metadata={
                <Detail.Metadata>
                  <Detail.Metadata.TagList title="Deal">
                    <Detail.Metadata.TagList.Item text={activity.orderWorth} color="green" />
                    <Detail.Metadata.TagList.Item text={activity.projectName} color="orange" />
                  </Detail.Metadata.TagList>
                  <Detail.Metadata.Label title="Date" text={`${activity.date} ${activity.time}`} icon={Icon.Calendar} />
                  <Detail.Metadata.Separator />
                  <Detail.Metadata.Label title="Name" text={activity.name} icon={Icon.Person} />
                  <Detail.Metadata.Label title="Title" text={activity.title} icon={Icon.Building} />

                  <Detail.Metadata.TagList title="Email">
                    <Detail.Metadata.TagList.Item
                      text={activity.email}
                      icon={Icon.AtSymbol}
                      color={Color.Blue}
                      onAction={() => Clipboard.copy(activity.email)}
                    />
                  </Detail.Metadata.TagList>

                  <Detail.Metadata.TagList title="Cellphone">
                    <Detail.Metadata.TagList.Item
                      text={activity.cellPhone}
                      icon={Icon.Mobile}
                      color={Color.Blue}
                      onAction={() => Clipboard.copy(activity.cellPhone)}
                    />
                  </Detail.Metadata.TagList>

                  <Detail.Metadata.TagList title="Work Phone">
                    <Detail.Metadata.TagList.Item
                      text={activity.workPhone}
                      icon={Icon.Phone}
                      color={Color.Blue}
                      onAction={() => Clipboard.copy(activity.workPhone)}
                    />
                  </Detail.Metadata.TagList>

                  <Detail.Metadata.Separator />
                  <Detail.Metadata.TagList title="S2 ID">
                    <Detail.Metadata.TagList.Item
                      text={activity.crmId}
                      onAction={() => Clipboard.copy(activity.crmId)}
                    />
                  </Detail.Metadata.TagList>
                  <Detail.Metadata.TagList title="ClickUp ID">
                    <Detail.Metadata.TagList.Item
                      text={activity.crm2Id}
                      onAction={() => Clipboard.copy(activity.crm2Id)}
                    />
                  </Detail.Metadata.TagList>
                </Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel title={`${activity.name} @ ${activity.projectName}`}>
              <ActivityActions activity={activity} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
