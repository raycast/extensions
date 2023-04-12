import { Action, Icon } from "@raycast/api";
import { UUID } from "../../types/tim";
import TaskDetail from "../TaskDetail";

export const ShowRecordsAction: React.FC<{ id: UUID }> = ({ id }) => (
  <Action.Push title="Show Records" icon={Icon.List} target={<TaskDetail id={id} />} />
);
