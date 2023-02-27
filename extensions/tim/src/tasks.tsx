import { ActionPanel, List } from "@raycast/api";

import { GenealActions } from "./components/actions/GeneralActions";
import Group from "./components/Group";
import Task from "./components/Task";
import { View } from "./components/View";

import { useCachedState } from "@raycast/utils";
import { useData } from "./state/data";
import { Data, Tag } from "./types/tim";

const Tasks: React.FC = () => {
  const { data, isLoading } = useData();
  const [tagFilter, setTagFilter] = useCachedState<string | undefined>("tagFilter", "");

  const tags = Object.values(data?.tags ?? {});
  const firstLevel = getFirstLevel(data, tagFilter);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={<TagDropdown onTagChange={setTagFilter} tags={tags} />}
    >
      <List.EmptyView
        title="No tasks"
        description="There are no tasks created by you."
        actions={
          <ActionPanel>
            <GenealActions />
          </ActionPanel>
        }
      />

      {firstLevel?.map((node) =>
        data?.tasks[node.id] ? (
          <Task id={node.id} key={node.id} />
        ) : (
          <Group id={node.id} tagFilter={tagFilter} key={node.id} />
        )
      )}
    </List>
  );
};

export default function Command() {
  return (
    <View>
      <Tasks />
    </View>
  );
}

type Props = {
  onTagChange: (string?: string) => void;
  tags: Tag[];
};
function TagDropdown({ onTagChange, tags }: Props) {
  return (
    <List.Dropdown tooltip="Tag" onChange={onTagChange} storeValue>
      <List.Dropdown.Item title="No active filter" value="" />
      <List.Dropdown.Section title="Tags">
        {tags.map((tag) => (
          <List.Dropdown.Item key={tag.id} title={tag.title} value={tag.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function getFirstLevel(data?: Data, tagFilter = "") {
  if (!data) return [];

  return data.nodes.filter((node) => {
    const isFirstLevel = node.parent === undefined;
    if (!isFirstLevel) return false;

    const task = data.tasks[node.id];
    if (task) {
      return tagFilter ? task.tags.includes(tagFilter) : true;
    }

    const group = data.groups[node.id];
    return group !== undefined;
  });
}
