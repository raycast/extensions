import { Color, List } from "@raycast/api";
import { Task } from "./lib/types";
import { useVirtualizorPaginated } from "./lib/hooks";
import timestampToDate from "./lib/utils/timestamp-to-date";
import { getProgressIcon } from "@raycast/utils";

export default function Tasks() {
  const { isLoading, data: tasks, pagination } = useVirtualizorPaginated<Task>("tasks");

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tasks" pagination={pagination} isShowingDetail>
      <List.Section title={`${tasks.length} tasks`}>
        {tasks.map((task) => {
          const progress = Number(task.progress_num);
          return (
            <List.Item
              key={task.actid}
              icon={getProgressIcon(Number(task.progress_num), progress === 100 ? Color.Green : Color.Red)}
              title={task.action || "NO ACTION"}
              accessories={[{ date: timestampToDate(task.time) }]}
              detail={
                <List.Item.Detail
                  markdown={`## Data \n\n ${task.data}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Started" text={task.started} />
                      <List.Item.Detail.Metadata.Label title="Updated" text={task.updated} />
                      <List.Item.Detail.Metadata.Label title="Ended" text={task.ended} />
                      <List.Item.Detail.Metadata.Label title="Status" text={task.status_txt} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
