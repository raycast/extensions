import { Detail, ActionPanel, Action, Icon, Color, showToast, Toast, Keyboard } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { FastlyService, DdosStats } from "../types";
import { getDdosStats, getDdosProtectionMode } from "../api";
import { DdosEventList } from "./ddos-event-list";
import { DdosRuleList } from "./ddos-rule-list";

interface DdosStatsDetailProps {
  service: FastlyService;
}

const RANGES = [
  { hours: 24, title: "Last 24 Hours" },
  { hours: 24 * 7, title: "Last 7 Days" },
];

function formatCount(count: number): string {
  return count.toLocaleString();
}

export function DdosStatsDetail({ service }: DdosStatsDetailProps) {
  const [stats, setStats] = useState<DdosStats | null>(null);
  const [mode, setMode] = useState<string | undefined>();
  const [rangeIndex, setRangeIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  // Guards against a slow, superseded load overwriting a newer range's results
  const loadSeq = useRef(0);

  useEffect(() => {
    loadStats(RANGES[rangeIndex].hours);
  }, [rangeIndex]);

  async function loadStats(hours: number) {
    const seq = ++loadSeq.current;
    try {
      setIsLoading(true);
      const [ddosStats, protectionMode] = await Promise.all([
        getDdosStats(service.id, hours),
        getDdosProtectionMode(service.id).catch(() => undefined),
      ]);
      if (seq !== loadSeq.current) return;
      setStats(ddosStats);
      setMode(protectionMode);
    } catch (error) {
      console.error("Error loading DDoS stats:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load DDoS stats",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      if (seq === loadSeq.current) {
        setIsLoading(false);
      }
    }
  }

  const range = RANGES[rangeIndex];
  let markdown = `# DDoS Protection — ${service.name}\n\n_${range.title}_\n\n`;

  if (stats) {
    if (stats.detected > 0) {
      const mitigationRate = ((stats.mitigated / stats.detected) * 100).toFixed(1);
      markdown += `**${formatCount(stats.detected)}** requests were identified as DDoS attack traffic, and **${formatCount(stats.mitigated)}** (${mitigationRate}%) were mitigated.\n\n`;
    } else {
      markdown += `No DDoS attack traffic was detected in this time range.\n\n`;
    }

    markdown += `| Metric | Requests |\n| --- | ---: |\n`;
    markdown += `| All requests | ${formatCount(stats.requests)} |\n`;
    markdown += `| Analyzed and allowed | ${formatCount(stats.allowed)} |\n`;
    markdown += `| Attack requests detected | ${formatCount(stats.detected)} |\n`;
    markdown += `| Attack requests mitigated | ${formatCount(stats.mitigated)} |\n`;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`DDoS Protection — ${service.name}`}
      metadata={
        stats ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Protection Mode">
              <Detail.Metadata.TagList.Item
                text={mode === "block" ? "Blocking" : mode === "log" ? "Log Only" : "Unknown"}
                color={mode === "block" ? Color.Green : mode === "log" ? Color.Orange : Color.SecondaryText}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="All Requests" text={formatCount(stats.requests)} />
            <Detail.Metadata.Label title="Allowed" text={formatCount(stats.allowed)} />
            <Detail.Metadata.Label title="Attacks Detected" text={formatCount(stats.detected)} />
            <Detail.Metadata.Label title="Attacks Mitigated" text={formatCount(stats.mitigated)} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.Push title="View Attack Events" icon={Icon.Bolt} target={<DdosEventList service={service} />} />
          <Action.Push title="View Rules" icon={Icon.List} target={<DdosRuleList service={service} />} />
          <Action
            title={rangeIndex === 0 ? "Show Last 7 Days" : "Show Last 24 Hours"}
            icon={Icon.Calendar}
            onAction={() => setRangeIndex(rangeIndex === 0 ? 1 : 0)}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => loadStats(range.hours)}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <Action.CopyToClipboard title="Copy Service ID" content={service.id} />
        </ActionPanel>
      }
    />
  );
}
