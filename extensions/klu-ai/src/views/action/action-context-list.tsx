import klu from "@/libs/klu";
import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ActionViewDropdown, ActionViewState } from "./action-view";

const ActionContextList = ({ guid, onChange }: { guid: string; onChange: (value: ActionViewState) => void }) => {
  const { data, isLoading } = useCachedPromise(
    async (actionGuid: string) => {
      const data = await klu.actions.getContext(actionGuid);
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
      searchBarPlaceholder="Search context"
      isLoading={isLoading}
      navigationTitle="Results"
      searchBarAccessory={<ActionViewDropdown onChange={onChange} />}
    >
      {data.map((a, id) => (
        <List.Item key={id} id={id.toLocaleString()} title={a.name ?? ""} subtitle={a.description ?? ""} />
      ))}
    </List>
  );
};

export default ActionContextList;
