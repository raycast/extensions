import { Detail, ActionPanel, Action, Icon, showToast, Toast, Keyboard } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { FastlyService, BotStats, BotManagementConfiguration } from "../types";
import { getBotStats, getBotManagementConfiguration } from "../api";

interface BotStatsDetailProps {
  service: FastlyService;
}

const RANGES = [
  { hours: 24, title: "Last 24 Hours" },
  { hours: 24 * 7, title: "Last 7 Days" },
];

function formatCount(count: number): string {
  return count.toLocaleString();
}

export function BotStatsDetail({ service }: BotStatsDetailProps) {
  const [stats, setStats] = useState<BotStats | null>(null);
  const [configuration, setConfiguration] = useState<BotManagementConfiguration | null>(null);
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
      const [botStats, config] = await Promise.all([
        getBotStats(service.id, hours),
        getBotManagementConfiguration(service.id).catch(() => null),
      ]);
      if (seq !== loadSeq.current) return;
      setStats(botStats);
      setConfiguration(config?.configuration || null);
    } catch (error) {
      console.error("Error loading bot stats:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load bot stats",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      if (seq === loadSeq.current) {
        setIsLoading(false);
      }
    }
  }

  const range = RANGES[rangeIndex];
  let markdown = `# Bot Traffic — ${service.name}\n\n_${range.title}_\n\n`;

  if (stats) {
    const detectionRate = stats.analyzed > 0 ? ((stats.detected / stats.analyzed) * 100).toFixed(1) : "0";
    markdown += `**${formatCount(stats.detected)}** bot requests detected out of **${formatCount(stats.analyzed)}** analyzed (${detectionRate}%).\n\n`;

    const types = Object.entries(stats.byType).sort(([, a], [, b]) => b - a);
    if (types.length > 0) {
      markdown += `## Detections by Bot Type\n\n| Bot Type | Requests |\n| --- | ---: |\n`;
      for (const [label, count] of types) {
        markdown += `| ${label} | ${formatCount(count)} |\n`;
      }
    } else if (stats.analyzed === 0) {
      markdown += `_No bot analysis data recorded in this time range. Make sure the service is receiving traffic and Bot Management is deployed._\n`;
    } else {
      markdown += `_No bot detections in this time range._\n`;
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`Bot Traffic — ${service.name}`}
      metadata={
        stats ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Analyzed Requests" text={formatCount(stats.analyzed)} />
            <Detail.Metadata.Label title="Detected Bots" text={formatCount(stats.detected)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Challenges Issued" text={formatCount(stats.challenges_issued)} />
            <Detail.Metadata.Label title="Challenges Passed" text={formatCount(stats.challenges_succeeded)} />
            <Detail.Metadata.Label title="Challenges Failed" text={formatCount(stats.challenges_failed)} />
            {configuration?.contentguard && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Label title="ContentGuard" text={configuration.contentguard} />
              </>
            )}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
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
