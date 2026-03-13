import { List, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { neon } from "../neon";
import { formatDate } from "../utils";

export function ListComputes({ projectId, branchId }: { projectId: string; branchId: string }) {
  const { isLoading, data: endpoints } = usePromise(async () => {
    const res = await neon.listProjectBranchEndpoints(projectId, branchId);
    return res.data.endpoints;
  });
  return (
    <List isLoading={isLoading}>
      {endpoints?.map((endpoint) => (
        <List.Item
          key={endpoint.id}
          icon={Icon.ComputerChip}
          title={endpoint.id}
          accessories={[
            {
              text: `${endpoint.autoscaling_limit_max_cu} CU`,
              tooltip: `Size: ${endpoint.autoscaling_limit_max_cu} vCPU`,
            },
            { text: `Last active: ${endpoint.last_active ? formatDate(endpoint.last_active) : "never"}` },
          ]}
        />
      ))}
    </List>
  );
}
