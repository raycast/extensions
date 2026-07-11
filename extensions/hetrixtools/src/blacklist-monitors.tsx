import { Action, ActionPanel, Color, Icon, Image, Keyboard, List } from "@raycast/api";
import { BlacklistMonitor } from "./types";
import useHetrixTools from "./use-hetrix-tools";
import { getFavicon, useCachedState } from "@raycast/utils";
import { parseNumAsDate } from "./utils";

export default function BlacklistMonitors() {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-blacklist-details", false);
  const { isLoading, data: monitors, pagination } = useHetrixTools<BlacklistMonitor>("blacklist-monitors");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search blacklist monitor"
      pagination={pagination}
      isShowingDetail={isShowingDetail}
    >
      {monitors.map((monitor) => {
        const icon: Image.ImageLike = monitor.listed.length
          ? { source: Icon.ExclamationMark, tintColor: Color.Red }
          : { source: Icon.Check, tintColor: Color.Green };

        const created_at = parseNumAsDate(monitor.created_at);
        const last_check = parseNumAsDate(monitor.last_check);

        const markdown = !monitor.listed.length
          ? ""
          : `
| RBL | Delist |
|-----|--------|
${monitor.listed.map((list) => `| ${list.rbl} | ${list.delist} |`).join(`\n`)}`;

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
                  ]
            }
            detail={
              <List.Item.Detail
                markdown={markdown}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="ID" text={monitor.id} />
                    <List.Item.Detail.Metadata.Label title="Name" text={monitor.name} />
                    <List.Item.Detail.Metadata.Label title="Type" text={monitor.type === "ipv4" ? "IPv4" : "Domain"} />
                    {monitor.type === "ipv4" ? (
                      <List.Item.Detail.Metadata.Label title="Target" text={monitor.target} />
                    ) : (
                      <List.Item.Detail.Metadata.Link title="Target" text={monitor.target} target={monitor.target} />
                    )}
                    <List.Item.Detail.Metadata.Link
                      title="Report"
                      text={monitor.report_id}
                      target={`https://hetrixtools.com/report/blacklist/${monitor.report_id}/`}
                    />
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
                <Action.OpenInBrowser
                  icon="hetrixtools.png"
                  url="https://hetrixtools.com/dashboard/blacklist-monitors/"
                />
                {monitor.type === "domain" && (
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
