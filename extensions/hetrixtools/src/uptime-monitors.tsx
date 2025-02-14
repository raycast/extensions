import { Action, ActionPanel, Color, Icon, Image, Keyboard, List } from "@raycast/api";
import { UptimeMonitor } from "./types";
import useHetrixTools from "./use-hetrix-tools";
import { getFavicon, useCachedState } from "@raycast/utils";
import { parseNumAsDate } from "./utils";

export default function UptimeMonitors() {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-details", false);
  const { isLoading, data: monitors, pagination } = useHetrixTools<UptimeMonitor>("uptime-monitors");

  function getUptimeColor(uptime: number) {
    if (uptime == 100) return Color.Green;
    return undefined;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search uptime monitor"
      pagination={pagination}
      isShowingDetail={isShowingDetail}
    >
      {monitors.map((monitor) => {
        const icon: Image.ImageLike =
          monitor.uptime_status === "up"
            ? { source: Icon.ArrowUp, tintColor: Color.Green }
            : { source: Icon.ArrowDown, tintColor: Color.Red };

        const created_at = parseNumAsDate(monitor.created_at);
        const last_check = parseNumAsDate(monitor.last_check);

        const markdown = `
| Location | Uptime Status | Response Time | Last Check |
|----------|---------------|---------------|------------|
${Object.entries(monitor.locations)
  .filter(([, val]) => !!val)
  .map(
    ([location, val]) =>
      `| ${location} | ${val.uptime_status} | ${val.response_time} | ${parseNumAsDate(val.last_check).toLocaleTimeString()} |`,
  )
  .join(`\n`)}`;

        return (
          <List.Item
            key={monitor.id}
            icon={icon}
            title={monitor.name}
            subtitle={isShowingDetail ? undefined : monitor.type}
            accessories={
              isShowingDetail
                ? undefined
                : [
                    { text: "Added" },
                    { date: created_at, tooltip: created_at.toString() },
                    { icon: Icon.Minus },
                    { text: "Checked" },
                    { date: last_check, tooltip: last_check.toString() },
                    { tag: { value: `${monitor.uptime}%`, color: getUptimeColor(monitor.uptime) } },
                  ]
            }
            detail={
              <List.Item.Detail
                markdown={markdown}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="ID" text={monitor.id} />
                    <List.Item.Detail.Metadata.Label title="Name" text={monitor.name} />
                    <List.Item.Detail.Metadata.Label title="Type" text={monitor.type} />
                    {monitor.target ? (
                      <List.Item.Detail.Metadata.Link title="Target" text={monitor.target} target={monitor.target} />
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Target" text="N/A" />
                    )}
                    <List.Item.Detail.Metadata.Label
                      title="Port"
                      text={monitor.port?.toString() ?? undefined}
                      icon={monitor.port === null ? Icon.Minus : undefined}
                    />
                    {monitor.keyword ? (
                      <List.Item.Detail.Metadata.TagList title="Keyword">
                        <List.Item.Detail.Metadata.TagList.Item text={monitor.keyword} />
                      </List.Item.Detail.Metadata.TagList>
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Keyword" icon={Icon.Minus} />
                    )}
                    {monitor.category ? (
                      <List.Item.Detail.Metadata.TagList title="Category">
                        <List.Item.Detail.Metadata.TagList.Item text={monitor.category} />
                      </List.Item.Detail.Metadata.TagList>
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Category" icon={Icon.Minus} />
                    )}
                    <List.Item.Detail.Metadata.Label title="Timeout" text={`${monitor.timeout} seconds`} />
                    <List.Item.Detail.Metadata.Label
                      title="Checkup Frequency"
                      text={monitor.check_frequency ? `${monitor.check_frequency} minutes` : "N/A"}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Resolve Address" text={monitor.resolve_address} />
                    <List.Item.Detail.Metadata.Label title="" text={`ASN: ${monitor.resolve_address_info.ASN}`} />
                    <List.Item.Detail.Metadata.Label title="" text={`ISP: ${monitor.resolve_address_info.ISP}`} />
                    <List.Item.Detail.Metadata.Label title="" text={`City: ${monitor.resolve_address_info.City}`} />
                    <List.Item.Detail.Metadata.Label title="" text={`Region: ${monitor.resolve_address_info.Region}`} />
                    <List.Item.Detail.Metadata.Label
                      title=""
                      text={`Country: ${monitor.resolve_address_info.Country}`}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="SSL Expiration Date"
                      text={monitor.ssl_expiration_date ?? undefined}
                      icon={monitor.ssl_expiration_date ?? Icon.Minus}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Domain Expiration Date"
                      text={monitor.domain_expiration_date ?? undefined}
                      icon={monitor.domain_expiration_date ?? Icon.Minus}
                    />
                    {monitor.nameservers ? (
                      <List.Item.Detail.Metadata.TagList title="Nameservers">
                        {monitor.nameservers.map((nameserver) => (
                          <List.Item.Detail.Metadata.TagList.Item key={nameserver} text={nameserver} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Nameservers" icon={Icon.Minus} />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.AppWindowSidebarLeft}
                  title="Toggle Details"
                  onAction={() => setIsShowingDetail((prev) => !prev)}
                />
                <Action.OpenInBrowser icon="hetrixtools.png" url="https://hetrixtools.com/dashboard/uptime-monitors/" />
                {monitor.target && (
                  <Action.OpenInBrowser
                    icon={getFavicon(monitor.target, { fallback: Icon.Globe })}
                    title={`Go to ${monitor.target}`}
                    url={monitor.target}
                    shortcut={Keyboard.Shortcut.Common.Open}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
