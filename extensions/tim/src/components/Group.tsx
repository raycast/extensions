import { List } from "@raycast/api";
import { useGroup } from "../hooks/useGroup";
import { UUID } from "../types/tim";
import Task from "./Task";

const Group: React.FC<{ id: UUID; tagFilter?: UUID }> = ({ id, tagFilter }) => {
  const { group, tasks } = useGroup(id, tagFilter);

  return (
    <List.Section title={group?.title ?? ""}>{tasks?.map((task) => <Task id={task.id} key={task.id} />)}</List.Section>
  );
};

export default Group;
