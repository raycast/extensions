import { ActionPanel, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import Group from "./components/Group";
import Task from "./components/Task";
import { View } from "./components/View";
import { GenealActions } from "./components/actions/GeneralActions";
import { useData } from "./state/data";
import { Data, Node, Tag } from "./types/tim";

const Tasks: React.FC = () => {
  const { data, isLoading } = useData();
  const [tagFilter, setTagFilter] = useCachedState<string | undefined>("tagFilter", "");

  const tags = Object.values(data?.tags ?? {});
  const { groups, tasks } = getFirstLevel(data, tagFilter);

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

      {groups.map((group) => (
        <Group id={group.id} tagFilter={tagFilter} key={group.id} />
      ))}

      {tasks.length > 0 &&
        (groups.length > 0 ? (
          <List.Section title="No Group">
            {tasks.map((task) => (
              <Task id={task.id} key={task.id} />
            ))}
          </List.Section>
        ) : (
          tasks.map((task) => <Task id={task.id} key={task.id} />)
        ))}
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
  if (!data) return { groups: [], tasks: [] };

  const groups: Node[] = [];
  const tasks: Node[] = [];
  for (const node of data.nodes) {
    const isFirstLevel = node.parent === undefined;
    if (!isFirstLevel) continue;

    const task = data.tasks[node.id];
    if (task) {
      if (tagFilter && !task.tags?.includes(tagFilter)) {
        continue;
      }
      tasks.push(node);
    }

    if (data.groups[node.id]) {
      groups.push(node);
    }
  }

  return { groups, tasks };
}
