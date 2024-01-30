import klu from "@/libs/klu";
import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { intlFormatDistance } from "date-fns";
import { ActionViewDropdown, ActionViewState } from "./action-view";

const ActionVersionList = ({ guid, onChange }: { guid: string; onChange: (value: ActionViewState) => void }) => {
  const { data, isLoading } = useCachedPromise(
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
          title={a.environment ?? ""}
          subtitle={a.guid}
          accessories={[
            {
              icon: Icon.Clock,
              text: intlFormatDistance(new Date(a.updatedAt), new Date()),
              tooltip: "Last updated",
            },
          ]}
        />
      ))}
    </List>
  );
};

export default ActionVersionList;
