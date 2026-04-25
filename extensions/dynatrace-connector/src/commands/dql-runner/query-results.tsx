// Query Results View — displays dynamic results from DQL query
import { List, Detail, Action, ActionPanel, Clipboard, showToast, Toast, Icon, Color } from "@raycast/api";
import { useDynatraceQuery } from "../../lib/query";
import { getActiveTenant } from "../../lib/tenants";
import type { TenantConfig } from "../../lib/auth";
import { saveSavedQuery } from "../../lib/savedQueries";
import { useEffect, useState } from "react";

// Log level colors and icons
const LOG_LEVEL_COLORS: Record<string, Color> = {
  ERROR: Color.Red,
  FATAL: Color.Red,
  WARN: Color.Yellow,
  WARNING: Color.Yellow,
  INFO: Color.Blue,
  DEBUG: Color.SecondaryText,
};

const LOG_LEVEL_ICONS: Record<string, Icon> = {
  ERROR: Icon.XMarkCircle,
  FATAL: Icon.XMarkCircle,
  WARN: Icon.Warning,
  WARNING: Icon.Warning,
  INFO: Icon.Info,
  DEBUG: Icon.Bug,
};

function getLogColor(loglevel?: string): Color {
  return LOG_LEVEL_COLORS[loglevel?.toUpperCase() ?? ""] ?? Color.SecondaryText;
}

function getLogIcon(loglevel?: string): Icon {
  return LOG_LEVEL_ICONS[loglevel?.toUpperCase() ?? ""] ?? Icon.Document;
}

interface QueryResultsViewProps {
  dql: string;
  timeframe?: { start: string; end: string };
  onClose?: () => void;
}

interface ResultMapping {
  index: number;
  key: string;
  type: string;
}

export default function QueryResultsView({ dql, timeframe, onClose }: QueryResultsViewProps) {
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const { data, isLoading, error, execute } = useDynatraceQuery();
  const [mappings, setMappings] = useState<ResultMapping[]>([]);

  useEffect(() => {
    const init = async () => {
      const activeTenant = await getActiveTenant();
      setTenant(activeTenant);
      if (activeTenant) {
        await execute(dql, timeframe, activeTenant);
      }
    };
    init();
  }, [dql, timeframe]);

  // Parse result mappings from response types
  useEffect(() => {
    if (data?.records && Array.isArray(data.records) && data.records.length > 0) {
      const firstRecord = data.records[0];
      if (typeof firstRecord === "object" && firstRecord !== null) {
        const keys = Object.keys(firstRecord);
        setMappings(
          keys.map((key, index) => ({
            index,
            key,
            type: typeof (firstRecord as Record<string, unknown>)[key],
          })),
        );
      }
    }
  }, [data?.records]);

  const handleSaveAsTemplate = async () => {
    try {
      const name = new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      const query = await saveSavedQuery({
        name: `Query - ${name}`,
        dql,
        timeframe: timeframe ? `${timeframe.start}|${timeframe.end}` : "last 1h",
        isFavorite: false,
        tenantId: tenant?.id,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Saved",
        message: `Query saved as "${query.name}"`,
      });
    } catch (saveErr) {
      const message = saveErr instanceof Error ? saveErr.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save query",
        message,
      });
    }
  };

  const handleCopyJson = async () => {
    if (!data?.records) return;
    try {
      await Clipboard.copy(JSON.stringify(data.records, null, 2));
      await showToast({
        style: Toast.Style.Success,
        title: "Copied",
        message: "Results copied to clipboard as JSON",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Copy failed",
      });
    }
  };

  const handleCopyDql = async () => {
    try {
      await Clipboard.copy(dql);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied",
        message: "DQL query copied to clipboard",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Copy failed",
      });
    }
  };

  if (error) {
    return (
      <Detail
        markdown={`# Query Error\n\n\`\`\`\n${error}\n\`\`\``}
        actions={
          <ActionPanel>
            <Action title="Back" icon={Icon.ArrowLeft} onAction={() => onClose?.()} />
            <Action title="Copy DQL" icon={Icon.Clipboard} onAction={handleCopyDql} />
          </ActionPanel>
        }
      />
    );
  }

  if (!data?.records || data.records.length === 0) {
    return (
      <Detail
        markdown={`# No Results\n\nYour query returned no results.\n\n\`\`\`dql\n${dql}\n\`\`\``}
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action title="Back" icon={Icon.ArrowLeft} onAction={() => onClose?.()} />
            <Action title="Copy DQL" icon={Icon.Clipboard} onAction={handleCopyDql} />
          </ActionPanel>
        }
      />
    );
  }

  // Determine display columns: first 2 mappings for title/subtitle, rest for accessories
  const titleMapping = mappings[0];
  const subtitleMapping = mappings[1];
  const accessoryMappings = mappings.slice(2, 5); // Limit to 3 accessories

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Save as Saved Query" icon={Icon.StarCircle} onAction={handleSaveAsTemplate} />
          <Action title="Copy All as JSON" icon={Icon.Clipboard} onAction={handleCopyJson} />
          <Action title="Copy DQL Query" icon={Icon.Clipboard} onAction={handleCopyDql} />
          {onClose && <Action title="Back" icon={Icon.ArrowLeft} onAction={onClose} />}
        </ActionPanel>
      }
    >
      <List.Section title={`Results (${data.records.length} records)`}>
        {data.records.map((record, index) => {
          const recordObj = record as Record<string, unknown>;
          const title = titleMapping ? String(recordObj[titleMapping.key] ?? "—") : `Record ${index + 1}`;
          const subtitle = subtitleMapping ? String(recordObj[subtitleMapping.key] ?? "") : undefined;

          // Check if this record has a loglevel
          const loglevel = recordObj.loglevel as string | undefined;
          const logColor = getLogColor(loglevel);
          const logIcon = getLogIcon(loglevel);

          const accessories: Array<{ tag?: { value: string; color: Color }; text?: string }> = [];

          // Add loglevel tag if present
          if (loglevel) {
            accessories.push({
              tag: { value: loglevel.toUpperCase(), color: logColor },
            });
          }

          // Add other accessories
          for (const mapping of accessoryMappings) {
            const value = recordObj[mapping.key];
            if (value !== null && value !== undefined) {
              accessories.push({
                text: String(value).substring(0, 30),
              });
            }
          }

          return (
            <List.Item
              key={index}
              title={title}
              subtitle={subtitle}
              accessories={accessories.length > 0 ? accessories : undefined}
              icon={loglevel ? logIcon : Icon.Document}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Eye}
                    target={
                      <Detail
                        navigationTitle={`Record ${index + 1}`}
                        markdown={`\`\`\`json\n${JSON.stringify(recordObj, null, 2)}\n\`\`\``}
                        actions={
                          <ActionPanel>
                            <Action
                              title="Copy as JSON"
                              icon={Icon.Clipboard}
                              onAction={async () => {
                                await Clipboard.copy(JSON.stringify(recordObj, null, 2));
                                await showToast({
                                  style: Toast.Style.Success,
                                  title: "Copied",
                                });
                              }}
                            />
                          </ActionPanel>
                        }
                      />
                    }
                  />
                  <Action
                    title="Copy Record as JSON"
                    icon={Icon.Clipboard}
                    onAction={async () => {
                      await Clipboard.copy(JSON.stringify(recordObj, null, 2));
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Copied record to clipboard",
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
