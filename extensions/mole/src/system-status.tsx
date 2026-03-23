import { List, Icon, Color, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useEffect } from "react";
import { getMolePathSafe } from "./utils/mole";
import { type MoleStatus, formatBytes, formatPercent, formatRate } from "./utils/parsers";
import { getHealthIcon, getUsageColor, getBatteryIcon } from "./utils/icons";
import { MoleNotInstalled } from "./components/MoleNotInstalled";

export default function SystemStatus() {
  const molePath = getMolePathSafe();

  if (!molePath) {
    return <MoleNotInstalled />;
  }

  return <StatusView molePath={molePath} />;
}

function StatusView({ molePath }: { molePath: string }) {
  const { statusRefreshInterval } = getPreferenceValues<Preferences.SystemStatus>();
  const refreshInterval = parseInt(statusRefreshInterval ?? "5", 10);

  const { data, error, isLoading, revalidate } = useExec(molePath, ["status", "--json"], {
    parseOutput: ({ stdout }) => JSON.parse(stdout) as MoleStatus,
    keepPreviousData: true,
  });

  useEffect(() => {
    const id = setInterval(revalidate, refreshInterval * 1000);
    return () => clearInterval(id);
  }, [revalidate, refreshInterval]);

  if (error) {
    return (
      <List>
        <List.EmptyView title="Failed to Get System Status" description={error.message} icon={Icon.ExclamationMark} />
      </List>
    );
  }

  const refreshAction = (
    <ActionPanel>
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading} isShowingDetail>
      {data && (
        <>
          <List.Section title="Overview">
            <List.Item
              title="Health Score"
              icon={getHealthIcon(data.health_score)}
              accessories={[
                { tag: { value: `${data.health_score}/100`, color: getHealthIcon(data.health_score).tintColor } },
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.TagList title="Health">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={`${data.health_score}/100 - ${data.health_score_msg}`}
                          color={getHealthIcon(data.health_score).tintColor}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Label
                        title="Model"
                        text={`${data.hardware.model} - ${data.hardware.cpu_model}`}
                      />
                      <List.Item.Detail.Metadata.Label title="OS" text={data.hardware.os_version} />
                      <List.Item.Detail.Metadata.Label title="Uptime" text={data.uptime} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.TagList title="CPU">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={formatPercent(data.cpu.usage)}
                          color={getUsageColor(data.cpu.usage)}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Label
                        title="Load Average"
                        text={`${data.cpu.load1.toFixed(2)} / ${data.cpu.load5.toFixed(2)} / ${data.cpu.load15.toFixed(2)}`}
                      />
                      {data.thermal.cpu_temp > 0 && (
                        <List.Item.Detail.Metadata.Label
                          title="Temperature"
                          text={`${data.thermal.cpu_temp.toFixed(1)}\u00B0C`}
                        />
                      )}
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.TagList title="Memory">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={`${formatPercent(data.memory.used_percent)} - ${formatBytes(data.memory.used)} / ${data.hardware.total_ram}`}
                          color={getUsageColor(data.memory.used_percent)}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Label
                        title="Swap"
                        text={`${formatBytes(data.memory.swap_used)} / ${formatBytes(data.memory.swap_total)}`}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.TagList title="Disk (/)">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={`${formatPercent(data.disks[0]?.used_percent ?? 0)} - ${formatBytes(data.disks[0]?.used ?? 0)} / ${formatBytes(data.disks[0]?.total ?? 0)}`}
                          color={getUsageColor(data.disks[0]?.used_percent ?? 0)}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Separator />
                      {data.batteries.length > 0 && (
                        <List.Item.Detail.Metadata.TagList title="Battery">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={`${data.batteries[0].percent}% - ${data.batteries[0].status}`}
                            color={getBatteryIcon(data.batteries[0].percent, data.batteries[0].status).tintColor}
                          />
                        </List.Item.Detail.Metadata.TagList>
                      )}
                      {data.network.filter((n) => n.ip).length > 0 && (
                        <List.Item.Detail.Metadata.Label
                          title="Network"
                          text={`${data.network.filter((n) => n.ip)[0].name} - ${data.network.filter((n) => n.ip)[0].ip}`}
                        />
                      )}
                      <List.Item.Detail.Metadata.Label title="Processes" text={String(data.procs)} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={refreshAction}
            />
          </List.Section>

          <List.Section title="CPU">
            <List.Item
              title="Processor"
              subtitle={data.hardware.cpu_model}
              icon={Icon.ComputerChip}
              accessories={[{ tag: { value: formatPercent(data.cpu.usage), color: getUsageColor(data.cpu.usage) } }]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Model" text={data.hardware.cpu_model} />
                      <List.Item.Detail.Metadata.TagList title="Usage">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={formatPercent(data.cpu.usage)}
                          color={getUsageColor(data.cpu.usage)}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Cores"
                        text={`${data.cpu.core_count} (${data.cpu.p_core_count}P + ${data.cpu.e_core_count}E)`}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Load Average"
                        text={`${data.cpu.load1.toFixed(2)} / ${data.cpu.load5.toFixed(2)} / ${data.cpu.load15.toFixed(2)}`}
                      />
                      {data.thermal.cpu_temp > 0 && (
                        <List.Item.Detail.Metadata.Label
                          title="Temperature"
                          text={`${data.thermal.cpu_temp.toFixed(1)}\u00B0C`}
                        />
                      )}
                      {data.thermal.fan_count > 0 && (
                        <List.Item.Detail.Metadata.Label title="Fan Speed" text={`${data.thermal.fan_speed} RPM`} />
                      )}
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.TagList title="Per-Core">
                        {data.cpu.per_core.map((usage, i) => {
                          const type = i < data.cpu.p_core_count ? "P" : "E";
                          return (
                            <List.Item.Detail.Metadata.TagList.Item
                              key={`core-${i}`}
                              text={`${type}${i + 1}: ${formatPercent(usage)}`}
                              color={getUsageColor(usage)}
                            />
                          );
                        })}
                      </List.Item.Detail.Metadata.TagList>
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={refreshAction}
            />
          </List.Section>

          <List.Section title="Memory">
            <List.Item
              title="RAM"
              subtitle={`${formatBytes(data.memory.used)} / ${data.hardware.total_ram}`}
              icon={Icon.MemoryChip}
              accessories={[
                {
                  tag: {
                    value: formatPercent(data.memory.used_percent),
                    color: getUsageColor(data.memory.used_percent),
                  },
                },
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.TagList title="Usage">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={formatPercent(data.memory.used_percent)}
                          color={getUsageColor(data.memory.used_percent)}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Used"
                        text={`${formatBytes(data.memory.used)} / ${formatBytes(data.memory.total)}`}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Free"
                        text={formatBytes(data.memory.total - data.memory.used)}
                      />
                      <List.Item.Detail.Metadata.Label title="Cached" text={formatBytes(data.memory.cached)} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Swap" icon={Icon.MemoryChip} />
                      <List.Item.Detail.Metadata.Label
                        title="Swap Used"
                        text={`${formatBytes(data.memory.swap_used)} / ${formatBytes(data.memory.swap_total)}`}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={refreshAction}
            />
          </List.Section>

          <List.Section title="Disk">
            {data.disks.map((disk) => (
              <List.Item
                key={disk.mount}
                title={disk.mount}
                subtitle={`${formatBytes(disk.used)} / ${formatBytes(disk.total)}`}
                icon={{ source: Icon.HardDrive, tintColor: getUsageColor(disk.used_percent) }}
                accessories={[
                  { tag: { value: formatPercent(disk.used_percent), color: getUsageColor(disk.used_percent) } },
                  ...(disk.external ? [{ tag: "External" }] : []),
                ]}
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.TagList title="Usage">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={formatPercent(disk.used_percent)}
                            color={getUsageColor(disk.used_percent)}
                          />
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Mount" text={disk.mount} />
                        <List.Item.Detail.Metadata.Label title="Device" text={disk.device} />
                        <List.Item.Detail.Metadata.Label title="Used" text={formatBytes(disk.used)} />
                        <List.Item.Detail.Metadata.Label title="Free" text={formatBytes(disk.total - disk.used)} />
                        <List.Item.Detail.Metadata.Label title="Total" text={formatBytes(disk.total)} />
                        <List.Item.Detail.Metadata.Label title="Type" text={disk.fstype.toUpperCase()} />
                        <List.Item.Detail.Metadata.TagList title="External">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={disk.external ? "Yes" : "No"}
                            color={disk.external ? Color.Orange : Color.Green}
                          />
                        </List.Item.Detail.Metadata.TagList>
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
                    <Action.ShowInFinder path={disk.mount} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          {data.batteries.length > 0 && (
            <List.Section title="Battery">
              {data.batteries.map((battery, i) => (
                <List.Item
                  key={`battery-${i}`}
                  title={data.batteries.length > 1 ? `Battery ${i + 1}` : "Battery"}
                  icon={getBatteryIcon(battery.percent, battery.status)}
                  accessories={[
                    {
                      tag: {
                        value: `${battery.percent}%`,
                        color: getBatteryIcon(battery.percent, battery.status).tintColor,
                      },
                    },
                    { text: battery.status },
                  ]}
                  detail={
                    <List.Item.Detail
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.TagList title="Charge">
                            <List.Item.Detail.Metadata.TagList.Item
                              text={`${battery.percent}%`}
                              color={getBatteryIcon(battery.percent, battery.status).tintColor}
                            />
                          </List.Item.Detail.Metadata.TagList>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Status"
                            text={battery.status.charAt(0).toUpperCase() + battery.status.slice(1)}
                          />
                          <List.Item.Detail.Metadata.Label title="Time Left" text={battery.time_left || "N/A"} />
                          <List.Item.Detail.Metadata.Label title="Health" text={battery.health} />
                          <List.Item.Detail.Metadata.Label title="Cycle Count" text={String(battery.cycle_count)} />
                          <List.Item.Detail.Metadata.Label title="Capacity" text={`${battery.capacity}%`} />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={refreshAction}
                />
              ))}
            </List.Section>
          )}

          <List.Section title="Network">
            {data.network
              .filter((n) => n.ip)
              .map((iface) => (
                <List.Item
                  key={iface.name}
                  title={iface.name}
                  subtitle={iface.ip}
                  icon={Icon.Globe}
                  accessories={[
                    { text: `\u2193 ${formatRate(iface.rx_rate_mbs)}` },
                    { text: `\u2191 ${formatRate(iface.tx_rate_mbs)}` },
                  ]}
                  detail={
                    <List.Item.Detail
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Interface" text={iface.name} />
                          <List.Item.Detail.Metadata.Label title="IP Address" text={iface.ip} />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Download" text={formatRate(iface.rx_rate_mbs)} />
                          <List.Item.Detail.Metadata.Label title="Upload" text={formatRate(iface.tx_rate_mbs)} />
                          {data.proxy.enabled && (
                            <>
                              <List.Item.Detail.Metadata.Separator />
                              <List.Item.Detail.Metadata.Label title="Proxy Type" text={data.proxy.type} />
                              <List.Item.Detail.Metadata.Label title="Proxy Host" text={data.proxy.host} />
                            </>
                          )}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
                      <Action.CopyToClipboard title="Copy IP Address" content={iface.ip} />
                    </ActionPanel>
                  }
                />
              ))}
          </List.Section>

          <List.Section title="Top Processes">
            {data.top_processes.map((proc, i) => (
              <List.Item
                key={`proc-${i}`}
                title={proc.name}
                icon={Icon.Terminal}
                accessories={[{ text: `CPU ${proc.cpu}%` }, { text: `MEM ${proc.memory}%` }]}
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Process" text={proc.name} />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.TagList title="CPU">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={`${proc.cpu}%`}
                            color={getUsageColor(proc.cpu)}
                          />
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.TagList title="Memory">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={`${proc.memory}%`}
                            color={getUsageColor(proc.memory)}
                          />
                        </List.Item.Detail.Metadata.TagList>
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={refreshAction}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
