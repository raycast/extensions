import { Color, Icon, List } from "@raycast/api";
import { percentageToString, speedToString } from "../lib/utils";
import { ListItemMetadata } from "./list-item-metadata";
import { Speed } from "../lib/speedtest.types";

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
      icon={{
        source: type === "Upload" ? Icon.ArrowUpCircle : Icon.ArrowDownCircle,
        tintColor: type === "Upload" ? "#bf71ff" : Color.Blue,
      }}
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
