import klu from "@/libs/klu";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { intlFormatDistance } from "date-fns";
import { ActionViewDropdown, ActionViewState } from "./action-view";

const ActionVersionList = ({ guid, onChange }: { guid: string; onChange: (value: ActionViewState) => void }) => {
  const { data, isLoading, revalidate } = useCachedPromise(
    async (actionGuid: string) => {
      const data = await klu.actions.getVersions(actionGuid);
      return data;
    },
    [guid],
    {
      execute: guid.length !== 0,
      keepPreviousData: true,
      initialData: [],
    },
  );

  return (
    <List
      searchBarPlaceholder="Search version"
      isLoading={isLoading}
      navigationTitle="Results"
      searchBarAccessory={<ActionViewDropdown onChange={onChange} />}
    >
      {data.map((a) => (
        <List.Item
          key={a.guid}
          id={a.guid}
          title={a.guid}
          accessories={
            a.environment
              ? [
                  {
                    tag: {
                      value: a.environment,
                      color:
                        a.environment === "Production"
                          ? Color.Green
                          : a.environment === "Staging"
                            ? Color.Yellow
                            : Color.Orange,
                    },
                  },
                  {
                    icon: Icon.Clock,
                    text: intlFormatDistance(new Date(a.updatedAt), new Date()),
                    tooltip: "Last updated",
                  },
                ]
              : [
                  {
                    icon: Icon.Clock,
                    text: intlFormatDistance(new Date(a.updatedAt), new Date()),
                    tooltip: "Last updated",
                  },
                ]
          }
          actions={
            <ActionPanel title={a.guid}>
              <ActionPanel.Section title="Copy">
                <Action.CopyToClipboard title="Copy ID" content={a.guid ?? ""} />
              </ActionPanel.Section>
              <ActionPanel.Section title="Miscellaneous">
                <Action icon={Icon.RotateClockwise} title="Refresh" onAction={() => revalidate()} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default ActionVersionList;
