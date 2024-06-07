import { Color, Icon, List } from "@raycast/api";
import { percentageToString, speedToString } from "../lib/utils";
import { ListItemMetadata } from "./list-item-metadata";
import { Speed } from "../lib/speedtest.types";
import { icons } from "../lib/speedtest-pretty-names";

type SpeedListItemProps = {
  speed: number;
  fullSpeedInfo: Speed;
  progress?: number;
  children: JSX.Element;
  type: "Upload" | "Download";
};

export function SpeedListItem({ progress, fullSpeedInfo, children, speed, type }: SpeedListItemProps): JSX.Element {
  return (
    <List.Item
      title={type}
      subtitle={percentageToString(progress)}
      icon={type === "Download" ? icons.download : icons.upload}
      actions={children}
      accessories={[
        {
          text: `${speedToString(speed)}`,
        },
      ]}
      detail={fullSpeedInfo && <ListItemMetadata data={fullSpeedInfo} />}
    />
  );
}
