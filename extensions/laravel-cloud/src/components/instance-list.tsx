import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listInstances } from "../api/instances";
import { Instance } from "../types/instance";

interface Props {
  environmentId: string;
  environmentName: string;
}

export default function InstanceList({ environmentId, environmentName }: Props) {
  const { data, isLoading } = useCachedPromise(
    (envId: string) => listInstances(envId, undefined, "backgroundProcesses"),
    [environmentId],
  );

  return (
    <List isLoading={isLoading} navigationTitle={`${environmentName} — Instances`}>
      {data?.data.map((instance) => (
        <InstanceListItem key={instance.id} instance={instance} />
      ))}
    </List>
  );
}

function InstanceListItem({ instance }: { instance: Instance }) {
  const { attributes } = instance;

  const scalingText =
    attributes.scaling_type === "none"
      ? `${attributes.min_replicas} replica${attributes.min_replicas !== 1 ? "s" : ""}`
      : `${attributes.min_replicas}-${attributes.max_replicas} replicas (${attributes.scaling_type})`;

  return (
    <List.Item
      icon={attributes.type === "app" ? Icon.Globe : attributes.type === "queue" ? Icon.List : Icon.Cog}
      title={attributes.name}
      subtitle={attributes.size}
      accessories={[
        { tag: attributes.type },
        { text: scalingText },
        ...(attributes.uses_scheduler ? [{ icon: Icon.Clock, tooltip: "Scheduler enabled" }] : []),
      ]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Instance ID" content={instance.id} />
        </ActionPanel>
      }
    />
  );
}
