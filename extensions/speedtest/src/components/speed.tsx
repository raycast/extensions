import { List } from "@raycast/api";
import { icons } from "../lib/speedtest-pretty-names";
import { Speed } from "../lib/speedtest.types";
import { percentageToString, speedToString } from "../lib/utils";
import { ListItemMetadata } from "./list-item-metadata";

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
