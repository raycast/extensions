import { Icon, List } from "@raycast/api";
import { Result } from "../speedtest";
import { ActivitySpeedQuality, InternetSpeed, Nullish } from "./type";
import { useEffect, useState } from "react";
import { convertBitsToMbps, speedToAvailableActivityQuality } from "./utils";

export const ListBandwidthItem = (props: {
  speed: Nullish<InternetSpeed>;
  activity: ActivitySpeedQuality;
  result: Result;
  isLoading: boolean;
  summary: JSX.Element;
  restart: JSX.Element;
  title: string;
  icon: Icon;
}): JSX.Element => {
  const { title, icon, speed, activity, isLoading } = props;
  const [qualities, setQualities] = useState<string>("");

  useEffect(() => {
    const speedMbps = {
      download: convertBitsToMbps(speed.download),
      upload: convertBitsToMbps(speed.upload),
    };

    const listOfAvailableActivityQuality = speedToAvailableActivityQuality(speedMbps, activity);

    setQualities(listOfAvailableActivityQuality.join(" "));
  }, [isLoading]);

  return (
    <List.Item
      title={title}
      icon={{ source: icon, tintColor: "#494949" }}
      accessories={[
        {
          text: isLoading ? "?" : qualities,
          icon: qualities.length < 1 && !isLoading ? Icon.LivestreamDisabled : null,
        },
      ]}
    />
  );
};
