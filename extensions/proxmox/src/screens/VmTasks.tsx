import { List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { PveTask, PveVm, WithServer } from "@/types";
import { usePveFetch } from "@/hooks/use-pve-fetch";
import { describeFetchError } from "@/utils/errors";
import { TaskListItem } from "@/components/TaskListItem";

type VmTasksProps = {
  vm: WithServer<PveVm>;
};

export const VmTasks = ({ vm }: VmTasksProps) => {
  const search = new URLSearchParams({ vmid: vm.vmid.toString(), source: "all", limit: "50" });
  const { data, isLoading, revalidate } = usePveFetch<PveTask[]>(
    vm.server,
    `api2/json/nodes/${vm.node}/tasks?${search.toString()}`,
    {
      timerInterval: 2000,
      onError: (error) => {
        showFailureToast(error, { message: describeFetchError(error) });
      },
    },
  );

  return (
    <List isLoading={isLoading} navigationTitle={`Tasks of ${vm.name}`} searchBarPlaceholder="Search tasks">
      <List.EmptyView title="No tasks yet" description="Start, stop or back up this VM to see its tasks here" />
      {(data ?? []).map((task) => (
        <TaskListItem key={task.upid} server={vm.server} task={task} revalidate={revalidate} />
      ))}
    </List>
  );
};
