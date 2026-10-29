import { Color, Detail, Icon } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useMachine, usePolling } from "../hooks/use-machines";
import { getOperation } from "../services/lifecycle";
import { getMachineMetrics } from "../services/machines";
import { listPorts } from "../services/ports";
import { Machine, MachineMetric, Operation, PublicPort } from "../types";
import { formatBytes, formatDateTime, formatDuration, formatRelative, formatSpec, progressBar } from "../utils/format";
import { operationProgress, stateInfo } from "../utils/machine-state";
import { MachineActions } from "./machine-actions";

interface MachineDetailsProps {
  machine: Machine;
  onChange: () => void;
}

export function MachineDetails({ machine: initial, onChange }: MachineDetailsProps) {
  const { data: machine, isLoading, revalidate } = useMachine(initial);
  const running = machine.state === "running";
  const deleted = machine.state === "deleted";

  // Not cached, so old readings never show as current.
  const { data: metrics, revalidate: revalidateMetrics } = usePromise(getMachineMetrics, [machine.id], {
    execute: running,
    onError: () => undefined,
  });
  const { data: ports, revalidate: revalidatePorts } = useCachedPromise(listPorts, [machine.id], {
    execute: !deleted,
    onError: () => undefined,
  });
  const { data: operation, revalidate: revalidateOperation } = usePromise(
    getOperation,
    [machine.operationId ?? "", undefined],
    { execute: !!machine.operationId, onError: () => undefined },
  );
  usePolling(!!machine.operationId, revalidateOperation);

  const refresh = () => {
    revalidate();
    revalidateMetrics();
    revalidatePorts();
    onChange();
  };

  const { label, color } = stateInfo(machine);
  const labels = Object.entries(machine.metadata ?? {});

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={machine.name}
      markdown={detailMarkdown(machine, running ? metrics : undefined, operation, ports?.ports ?? [])}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={label} color={color} />
            {machine.runtime.ready && <Detail.Metadata.TagList.Item text="Ready" color={Color.Green} />}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Machine ID" text={machine.id} />
          <Detail.Metadata.Label
            title="Template"
            icon={Icon.Box}
            text={`${machine.template.id} ${machine.template.version}`}
          />
          {machine.snapshot && <Detail.Metadata.Label title="From Snapshot" text={machine.snapshot.id} />}
          <Detail.Metadata.Label title="Size" icon={Icon.ComputerChip} text={formatSpec(machine.spec)} />
          <Detail.Metadata.Label
            title="Storage"
            icon={Icon.HardDrive}
            text={`${machine.storage.sizeGiB} GB at ${machine.storage.mountPath}`}
          />
          <Detail.Metadata.Label title="Linux User" text={machine.guestUser} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Pause When Idle"
            icon={Icon.Clock}
            text={machine.autoSuspendAfterSeconds ? `After ${formatDuration(machine.autoSuspendAfterSeconds)}` : "Off"}
          />
          {machine.autoSuspendedAt && (
            <Detail.Metadata.Label title="Paused for Idleness" text={formatDateTime(machine.autoSuspendedAt)} />
          )}
          {machine.archiveAt && <Detail.Metadata.Label title="Stops At" text={formatDateTime(machine.archiveAt)} />}
          <Detail.Metadata.Label title="Vault Secrets" text={machine.vault ? "Injected" : "Off"} />
          {labels.length > 0 && (
            <Detail.Metadata.TagList title="Labels">
              {labels.map(([key, value]) => (
                <Detail.Metadata.TagList.Item key={key} text={`${key}=${value}`} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {(ports?.ports.length ?? 0) > 0 && <Detail.Metadata.Separator />}
          {ports?.ports.map((port) => (
            <Detail.Metadata.Link key={port.id} title={`Port ${port.port}`} text={port.name} target={port.url} />
          ))}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Created" text={formatDateTime(machine.createdAt)} />
          <Detail.Metadata.Label title="Updated" text={formatRelative(machine.updatedAt)} />
        </Detail.Metadata>
      }
      actions={<MachineActions machine={machine} onChange={refresh} isShowingDetails />}
    />
  );
}

function detailMarkdown(
  machine: Machine,
  metrics: MachineMetric[] | undefined,
  operation: Operation | undefined,
  ports: PublicPort[],
) {
  const lines = [`# ${machine.name}`, ""];
  if (machine.state === "deleted") return [...lines, "This machine was deleted."].join("\n");

  if (machine.operationId) {
    lines.push(`> ⏳ ${operation ? operationProgress(operation) : "An operation is in progress…"}`, "");
  }
  if (machine.lastError) {
    lines.push(`> ⚠️ **${machine.lastError.code}**: ${machine.lastError.message}`, "");
  }

  const latest = metrics?.at(-1);
  if (latest) {
    lines.push(
      "## Resources",
      "",
      `**CPU** ${latest.cpuUsedPct.toFixed(0)}% of ${latest.cpuCount} vCPU  `,
      `\`${progressBar(latest.cpuUsedPct, 100)}\``,
      "",
      `**Memory** ${formatBytes(latest.memUsed)} of ${formatBytes(latest.memTotal)} touched  `,
      `\`${progressBar(latest.memUsed, latest.memTotal)}\``,
      "",
    );
  } else if (machine.state !== "running") {
    lines.push("Resource usage shows while the machine is running.", "");
  }

  if (ports.length > 0) {
    lines.push("## Public Ports", "", ...ports.map((port) => `- **${port.port}** ${port.name}: ${port.url}`), "");
  }

  lines.push("## Connect", "", "```bash", `instabox ssh ${machine.name}`, "```");
  return lines.join("\n");
}
