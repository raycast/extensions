import { ActionPanel, List } from "@raycast/api";
import Group from "./components/Group";
import Task from "./components/Task";

import { GenealActions } from "./components/actions/GeneralActions";

import { View } from "./components/View";
import { useData } from "./state/data";

const Tasks: React.FC = () => {
  const { data, isLoading } = useData();

  const firstLevel = data?.nodes.filter((node) => node.parent == undefined) ?? [];

  return (
    <List isLoading={isLoading} isShowingDetail>
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
        data?.tasks[node.id] ? <Task id={node.id} key={node.id} /> : <Group id={node.id} key={node.id} />
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
