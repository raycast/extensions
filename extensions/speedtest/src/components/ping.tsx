import { List } from "@raycast/api";
import { latencySvg, progressRingIcon } from "../lib/charts";
import { icons } from "../lib/speedtest-pretty-names";
import { Ping } from "../lib/speedtest.types";
import { mdImg, theme, toUri } from "../lib/svg";
import { pingToString } from "../lib/utils";
import { ListItemMetadata } from "./list-item-metadata";

type PingListItemProps = {
  ping: number;
  fullPingData: Ping;
  progress?: number;
  children?: React.ReactNode;
};

export function PingListItem({ ping, fullPingData, progress, children }: PingListItemProps) {
  const isRunning = progress !== undefined && progress < 1;
  const icon = isRunning ? { source: toUri(progressRingIcon(progress, theme.ping)) } : icons.ping;
  const markdown = mdImg(latencySvg(fullPingData, "Idle latency"), "Ping latency", 320);

  return (
    <List.Item
      title="Ping"
      icon={icon}
      actions={children}
      accessories={[
        {
          text: `${pingToString(ping)}`,
        },
      ]}
      detail={fullPingData && <ListItemMetadata data={fullPingData} markdown={markdown} />}
    />
  );
}
