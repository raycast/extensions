import klu from "@/libs/klu";
import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { intlFormatDistance } from "date-fns";
import { ActionViewDropdown, ActionViewState } from "./action-view";

const ActionSkillList = ({ guid, onChange }: { guid: string; onChange: (value: ActionViewState) => void }) => {
  const { data, isLoading } = useCachedPromise(
    async (actionGuid: string) => {
      const data = await klu.actions.getSkills(actionGuid);
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
      searchBarPlaceholder="Search skill"
      isLoading={isLoading}
      navigationTitle="Results"
      searchBarAccessory={<ActionViewDropdown onChange={onChange} />}
    >
      {data.map((a, id) => (
        <List.Item
          key={id}
          id={id.toLocaleString()}
          title={a.name ?? ""}
          subtitle={a.metadata ?? ""}
          accessories={[
            {
              icon: Icon.Clock,
              text: a.createdAt ? intlFormatDistance(new Date(a.createdAt), new Date()) : "-",
              tooltip: "Last updated",
            },
          ]}
        />
      ))}
    </List>
  );
};

export default ActionSkillList;
