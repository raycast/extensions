import { Detail, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { CONTAINER_BIN, APPLE_EPOCH_OFFSET, Container } from "./lib/container";
import { relativeTime, statusIcon, formatCpus, formatMemory } from "./lib/format";
import { useStreamingLogs } from "./lib/hooks";
import { useState, useMemo } from "react";

export default function ContainerLogs({ name, container }: { name: string; container?: Container }) {
  const [showBoot, setShowBoot] = useState(false);
  const [follow, setFollow] = useState(false);

  // Static fetch (when not following)
  const logArgs = showBoot ? ["logs", "--boot", name] : ["logs", name];
  const { isLoading, data, revalidate } = useExec(CONTAINER_BIN, logArgs, {
    keepPreviousData: true,
    execute: !follow,
  });

  // Streaming fetch (when following, boot logs don't support -f)
  const { logs: streamLogs, clear } = useStreamingLogs(name, follow && !showBoot);

  // Fallback: fetch inspect data if no container prop was passed
  const { data: inspectData } = useExec(CONTAINER_BIN, ["inspect", name], {
    execute: !container,
  });

  const meta = useMemo(() => {
    if (container) return container;
    if (!inspectData) return null;
    try {
      const raw = JSON.parse(inspectData);
      const info = Array.isArray(raw) ? raw[0] : raw;
      if (!info) return null;
      const config = info.configuration || {};
      const resources = config.resources || {};
      const configNets = config.networks || [];
      const runtimeNets = info.networks || [];
      const runtime = runtimeNets[0] || {};
      const platform = config.platform || {};
      return {
        status: info.status || "",
        image: config.image?.reference || "",
        startedAt: info.startedDate ? new Date((info.startedDate + APPLE_EPOCH_OFFSET) * 1000).toISOString() : undefined,
        cpus: Number(resources.cpus || 0),
        memoryInBytes: Number(resources.memoryInBytes || 0),
        networkName: configNets[0]?.network || "",
        ipv4Address: runtime.ipv4Address || "",
        ports: (config.publishedPorts || []).map(
          (p: { hostPort?: number; containerPort?: number; proto?: string }) => ({
            hostPort: p.hostPort || 0,
            containerPort: p.containerPort || 0,
            protocol: p.proto || "tcp",
          }),
        ),
        platform: [platform.os, platform.architecture].filter(Boolean).join("/"),
        rosetta: config.rosetta === true,
      };
    } catch {
      return null;
    }
  }, [container, inspectData]);

  const displayLogs = follow && !showBoot ? streamLogs : data;
  const logs = displayLogs ? "```\n" + displayLogs + "\n```" : "*No logs available*";

  return (
    <Detail
      isLoading={!follow && isLoading}
      navigationTitle={`${name} — ${follow ? "Following" : "Logs"}`}
      markdown={logs}
      metadata={
        meta ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Status" text={meta.status} icon={statusIcon(meta.status)} />
            <Detail.Metadata.Label title="Image" text={meta.image} />
            {meta.startedAt && <Detail.Metadata.Label title="Uptime" text={relativeTime(meta.startedAt)} />}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="CPU" text={formatCpus(meta.cpus)} />
            <Detail.Metadata.Label title="Memory" text={formatMemory(meta.memoryInBytes)} />
            <Detail.Metadata.Separator />
            {meta.ports.length > 0 && (
              <Detail.Metadata.TagList title="Ports">
                {meta.ports.map((p: { hostPort: number; containerPort: number; protocol: string }, i: number) => (
                  <Detail.Metadata.TagList.Item key={i} text={`${p.hostPort}:${p.containerPort}`} />
                ))}
              </Detail.Metadata.TagList>
            )}
            <Detail.Metadata.Label title="Network" text={meta.networkName} />
            {meta.ipv4Address && <Detail.Metadata.Label title="IP" text={meta.ipv4Address} />}
            <Detail.Metadata.Label title="Platform" text={meta.platform || "—"} />
            {meta.rosetta && (
              <Detail.Metadata.TagList title="Flags">
                <Detail.Metadata.TagList.Item text="Rosetta" color={Color.Blue} />
              </Detail.Metadata.TagList>
            )}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title={follow ? "Stop Following" : "Follow Logs"}
            icon={follow ? Icon.Stop : Icon.Livestream}
            onAction={() => {
              if (!follow) setShowBoot(false);
              setFollow(!follow);
            }}
          />
          {!follow && <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />}
          {follow && <Action title="Clear" icon={Icon.Eraser} onAction={clear} />}
          <Action
            title={showBoot ? "Show App Logs" : "Show Boot Logs"}
            icon={Icon.Switch}
            onAction={() => {
              setFollow(false);
              setShowBoot(!showBoot);
            }}
          />
          <Action.CopyToClipboard title="Copy Logs" content={displayLogs || ""} />
        </ActionPanel>
      }
    />
  );
}
