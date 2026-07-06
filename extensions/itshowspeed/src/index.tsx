import { MenuBarExtra } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { getNetworkData, getTraffic, type TrafficData } from "./utils";

const Command = () => {
  const [netData, setNetData] = useCachedState<{
    prev: TrafficData | null;
    current: TrafficData;
  } | null>("TrafficData", null);

  const { isLoading } = useCachedPromise(getNetworkData, [], {
    onData(data) {
      if (!netData) {
        setNetData({
          prev: null,
          current: data,
        });
      } else {
        setNetData({
          prev: netData.current,
          current: data,
        });
      }
    },
  });

  return (
    <MenuBarExtra
      isLoading={isLoading}
      title={`▲ ${getTraffic(netData, "sent")}   ▼ ${getTraffic(netData, "received")}`}
    />
  );
};

export default Command;
