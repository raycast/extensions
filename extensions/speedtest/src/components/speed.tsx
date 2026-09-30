import { List } from "@raycast/api";
import { loadedLatencySvg, progressRingIcon, speedGaugeSvg, speedSparklineSvg } from "../lib/charts";
import { icons } from "../lib/speedtest-pretty-names";
import { Speed } from "../lib/speedtest.types";
import { mdImg, theme, toUri } from "../lib/svg";
import { percentageToString, speedToString } from "../lib/utils";
import { ListItemMetadata } from "./list-item-metadata";

type SpeedListItemProps = {
  speed: number;
  fullSpeedInfo: Speed;
  progress?: number;
  samples?: number[];
  children?: React.ReactNode;
  type: "Upload" | "Download";
};

export function SpeedListItem({ progress, fullSpeedInfo, children, speed, type, samples = [] }: SpeedListItemProps) {
  const color = type === "Download" ? theme.download : theme.upload;
  const isRunning = progress !== undefined && progress < 1;
  const icon = isRunning
    ? { source: toUri(progressRingIcon(progress, color)) }
    : type === "Download"
      ? icons.download
      : icons.upload;

  // With metadata below it, the detail's markdown pane is only ~180pt tall, so the
  // 300×240 gauge is scaled to 200pt wide (160pt tall) to keep its bottom labels visible.
  const markdown = [
    mdImg(speedGaugeSvg({ bandwidth: speed, progress, label: type, color }), `${type} gauge`, 200),
    mdImg(speedSparklineSvg(samples, color), `${type} samples`, 320),
    mdImg(loadedLatencySvg(fullSpeedInfo, `${type} latency (IQM)`, color), `${type} latency`, 320),
  ].join("\n\n");

  return (
    <List.Item
      title={type}
      subtitle={percentageToString(progress)}
      icon={icon}
      actions={children}
      accessories={[
        {
          text: `${speedToString(speed)}`,
        },
      ]}
      detail={fullSpeedInfo && <ListItemMetadata data={fullSpeedInfo} markdown={markdown} />}
    />
  );
}
