import { List, Action, ActionPanel, useNavigation } from "@raycast/api";
import { fetchWorkItems } from "../../api/fetchTasks";
import { WorkItemDetails } from "../../models/task";
import TaskDetails from "./TaskDetails";
import { GetTaskIconType, GetIconColor } from "../../utils/IconType";

export default function TaskList({ projectName }: { projectName: string }) {
  const { data, isLoading } = fetchWorkItems(projectName);
  const { push } = useNavigation();

  return (
    <List isLoading={isLoading}>
      {data?.value.map((workItem: WorkItemDetails) => (
        <List.Item
          key={workItem.id}
          icon={{
            source: GetTaskIconType(workItem.fields["System.State"]),
            tintColor: GetIconColor(workItem.fields["System.State"]),
          }}
          title={workItem.fields["System.Title"]}
          subtitle={workItem.fields["System.State"] || "No description available"}
          actions={
            <ActionPanel>
              <Action
                title="Show Work Item Details"
                onAction={() => push(<TaskDetails workItemDetails={workItem} />)}
              />
            </ActionPanel>
          }
          accessories={[
            {
              text: workItem.fields["System.AssignedTo"] || "Unassigned",
            },
          ]}
        />
      ))}
    </List>
  );
}
