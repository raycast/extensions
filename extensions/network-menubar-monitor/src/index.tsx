import { Icon, MenuBarExtra } from "@raycast/api";
import { getNetworkData, TrafficData } from "./utils";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { getTraffic } from "./utils";

export default function Command() {
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
      icon={Icon.ChevronUpDown}
      isLoading={isLoading}
      title={`${getTraffic(netData, "received")}/${getTraffic(netData, "sent")}`}
    />
  );
}
