import { Icon, Image, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { ListItemMetadata } from "../list-item-metadata";
import { ActivitySpeedQuality, InternetSpeed } from "./types";
import { convertBitsToMbps, speedToAvailableActivityQuality } from "./utils";

type ListBandwidthItemProps = {
  speed: InternetSpeed;
  activity: ActivitySpeedQuality;
  isLoading: boolean;
  title: string;
  icon: Image.ImageLike;
  actions?: JSX.Element;
};

export const ListBandwidthItem = (props: ListBandwidthItemProps): JSX.Element => {
  const { title, icon, speed, activity, isLoading, actions } = props;
  const [qualities, setQualities] = useState<string>("");

  useEffect(() => {
    const speedMbps = {
      download: convertBitsToMbps(speed.download.bandwidth),
      upload: convertBitsToMbps(speed.upload.bandwidth),
    };

    const listOfAvailableActivityQuality = speedToAvailableActivityQuality(speedMbps, activity);

    setQualities(listOfAvailableActivityQuality.join(" "));
  }, [isLoading]);

  return (
    <List.Item
      title={title}
      icon={icon}
      accessories={[
        {
          text: isLoading ? "?" : qualities,
          icon: qualities.length < 1 && !isLoading ? Icon.LivestreamDisabled : null,
        },
      ]}
      detail={speed && <ListItemMetadata data={speed} />}
      actions={actions}
    />
  );
};
