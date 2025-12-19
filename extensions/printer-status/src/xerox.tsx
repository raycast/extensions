import { List, showToast, Toast, Icon, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchPrinterStats, PrinterStats } from "./snmp-client";
import { INK_COLORS, LABELS } from "./constants";

interface Preferences {
  printerIp: string;
  language: "en" | "fr";
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const host = preferences.printerIp;
  const language = preferences.language || "en";
  const labels = LABELS[language] || LABELS.en;

  const [stats, setStats] = useState<PrinterStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getStats() {
      if (!host) {
        showToast({
          style: Toast.Style.Failure,
          title: "Configuration Missing",
          message: "Please set the Printer IP in extension preferences.",
        });
        setIsLoading(false);
        return;
      }

      try {
        const data = await fetchPrinterStats(host);
        setStats(data);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch printer status",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    getStats();
  }, [host]);

  const getInkIcon = (level: string | null, color: string) => {
    if (!level) return Icon.Circle;
    const pct = parseInt(level, 10);
    if (isNaN(pct)) return Icon.Circle;

    if (pct < 10) return { source: Icon.Warning, tintColor: "red" };
    return { source: Icon.CircleFilled, tintColor: color };
  };

  return (
    <List isLoading={isLoading}>
      <List.Section title={labels.sectionGeneral}>
        {stats?.printerStatus && (
          <List.Item
            title={labels.status}
            subtitle={stats.printerStatus}
            icon={
              stats.printerStatus.toLowerCase().includes("error") || stats.printerStatus.toLowerCase().includes("jam")
                ? { source: Icon.Warning, tintColor: "red" }
                : { source: Icon.CheckCircle, tintColor: "green" }
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={stats.printerStatus} title={labels.copyStatus} />
              </ActionPanel>
            }
          />
        )}
        <List.Item
          title={labels.ipAddress}
          subtitle={host}
          icon={Icon.Network}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={host} title={labels.copyIp} />
            </ActionPanel>
          }
        />
        {stats?.printerName && (
          <List.Item
            title={labels.networkName}
            subtitle={stats.printerName}
            icon={Icon.Globe}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={stats.printerName} title={labels.copyName} />
              </ActionPanel>
            }
          />
        )}
        {stats?.modelName && (
          <List.Item
            title={labels.model}
            subtitle={stats.modelName}
            icon={Icon.Monitor}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={stats.modelName} title={labels.copyModel} />
              </ActionPanel>
            }
          />
        )}
        {stats?.serialNumber && (
          <List.Item
            title={labels.serialNumber}
            subtitle={stats.serialNumber}
            icon={Icon.Tag}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={stats.serialNumber} title={labels.copySerial} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      <List.Section title={labels.sectionPageCounts}>
        {stats?.pageCount && (
          <List.Item
            title={labels.total}
            subtitle={`${stats.pageCount} ${labels.pages}`}
            icon={Icon.Print}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={stats.pageCount} title={labels.copyTotal} />
              </ActionPanel>
            }
          />
        )}
        {stats?.blackPageCount && (
          <List.Item
            title={labels.blackWhite}
            subtitle={`${stats.blackPageCount} ${labels.pages}`}
            icon={Icon.Circle}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={stats.blackPageCount} title={labels.copyTotalBlack} />
              </ActionPanel>
            }
          />
        )}
        {stats?.colorPageCount && (
          <List.Item
            title={labels.color}
            subtitle={`${stats.colorPageCount} ${labels.pages}`}
            icon={Icon.CircleFilled}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={stats.colorPageCount} title={labels.copyTotalColor} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      <List.Section title={labels.sectionInkLevels}>
        {stats?.blackInkLevel && (
          <List.Item
            title={labels.black}
            subtitle={`${stats.blackInkLevel}%`}
            icon={getInkIcon(stats.blackInkLevel, INK_COLORS.BLACK)}
            accessories={[{ text: `${stats.blackInkLevel}%` }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={`${stats.blackInkLevel}%`} title={labels.copyBlackLevel} />
              </ActionPanel>
            }
          />
        )}
        {stats?.cyanInkLevel && (
          <List.Item
            title={labels.cyan}
            subtitle={`${stats.cyanInkLevel}%`}
            icon={getInkIcon(stats.cyanInkLevel, INK_COLORS.CYAN)}
            accessories={[{ text: `${stats.cyanInkLevel}%` }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={`${stats.cyanInkLevel}%`} title={labels.copyCyanLevel} />
              </ActionPanel>
            }
          />
        )}
        {stats?.magentaInkLevel && (
          <List.Item
            title={labels.magenta}
            subtitle={`${stats.magentaInkLevel}%`}
            icon={getInkIcon(stats.magentaInkLevel, INK_COLORS.MAGENTA)}
            accessories={[{ text: `${stats.magentaInkLevel}%` }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={`${stats.magentaInkLevel}%`} title={labels.copyMagentaLevel} />
              </ActionPanel>
            }
          />
        )}
        {stats?.yellowInkLevel && (
          <List.Item
            title={labels.yellow}
            subtitle={`${stats.yellowInkLevel}%`}
            icon={getInkIcon(stats.yellowInkLevel, INK_COLORS.YELLOW)}
            accessories={[{ text: `${stats.yellowInkLevel}%` }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={`${stats.yellowInkLevel}%`} title={labels.copyYellowLevel} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}
