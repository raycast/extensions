import { Icon, LaunchProps, List, Detail } from "@raycast/api";
import fetchAPI from "./components/fetchApi";
import { useEffect, useState, useRef } from "react";

export default function Command(props: LaunchProps<{ arguments: { city: string; bus: string } }>) {
  const [direction, setDirection] = useState("0");
  const [busEsTime, setBusEsTime] = useState<{ id: string; estimate: number }[] | undefined>(undefined);
  const [getBusStops, setGetBusStops] = useState<
    | {
        routeID: string;
        zhName: string;
        enName: string;
        timeUpdated: string;
        versionId: number;
        stops: {
          stopUid: string;
          stopId: string;
          stationId: string;
          stopBoarding: string;
          stopSequence: string;
          zhName: string;
          enName: string;
          stopLat: string;
          stopLong: string;
        }[];
      }
    | { message: string }
    | { error: string }
    | undefined
  >(undefined);
  const { city, bus } = props.arguments;
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip the effect on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    async function fetchStops() {
      setGetBusStops(undefined); // Show loading
      try {
        const data = await fetchAPI(`api/bus/stops/${city}/${bus}?direction=${direction}`);
        setGetBusStops(
          data as {
            routeID: string;
            zhName: string;
            enName: string;
            timeUpdated: string;
            versionId: number;
            stops: {
              stopUid: string;
              stopId: string;
              stationId: string;
              stopBoarding: string;
              stopSequence: string;
              zhName: string;
              enName: string;
              stopLat: string;
              stopLong: string;
            }[];
          },
        );
      } catch (error) {
        console.error("Error fetching bus stops:", error);
        setGetBusStops({ error: `Failed to get data for bus ${bus} in ${city}` });
      }
    }

    fetchStops();
  }, [direction, city, bus]);

  useEffect(() => {
    let cancelled = false;

    async function fetchOnce() {
      try {
        const data = await fetchAPI(`api/bus/current_status/${city}/${bus}?direction=${direction}`);
        if (!cancelled) {
          setBusEsTime(
            (
              data as {
                StopID: string;
                Direction: number;
                EstimateTime: number;
                StopStatus: number;
                SrcUpdateTime: string;
                UpdateTime: string;
              }[]
            ).map(
              (item: {
                StopID: string;
                Direction: number;
                EstimateTime: number;
                StopStatus: number;
                SrcUpdateTime: string;
                UpdateTime: string;
              }) => ({
                id: item.StopID,
                estimate: item.EstimateTime,
              }),
            ),
          );
        }
      } catch (e) {
        if (!cancelled) console.error("Error fetching bus ETA:", e);
      }
    }

    fetchOnce(); // initial fetch
    const intervalId = setInterval(fetchOnce, 30_000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [direction, city, bus]);

  if (getBusStops !== undefined && getBusStops.message === "API rate limit exceeded")
    return <Detail markdown="API rate limit exceeded. 請晚一點再試一次 :)" />;

  if (getBusStops?.error) {
    return <Detail markdown={`Error: ${getBusStops.error}`} />;
  }

  return (
    <List
      isLoading={getBusStops === undefined}
      searchBarAccessory={
        <List.Dropdown tooltip="Direction" value={direction} onChange={setDirection}>
          {[0, 1].map((d) => (
            <List.Dropdown.Item key={d} title={d === 0 ? "Outbound" : "Inbound"} value={String(d)} />
          ))}
        </List.Dropdown>
      }
    >
      {getBusStops?.stops?.map(
        (stop: {
          stopUid: string;
          stopId: string;
          stationId: string;
          stopSequence: number;
          zhName: string;
          enName: string;
          stopLat: number;
          stopLong: number;
        }) => (
          <List.Item
            key={stop.stopId}
            title={(() => {
              const s = busEsTime?.find((item) => item.id === stop.stopId)?.estimate;
              if (s === 0) {
                return "到站";
              } else if (s === undefined) {
                return "未預計";
              }
              return typeof s === "number" ? `${(s / 60).toFixed(0)}分鐘 ` : "";
            })()}
            subtitle={stop.enName}
            //actions={}
          />
        ),
      ) ||
        (getBusStops !== undefined
          ? [<List.Item key="no-stops" title="No bus stops found" icon={Icon.QuestionMark} />]
          : [])}
    </List>
  );
}
