import Departure from "./departure";
import useSWR from "swr";
import { IStation } from "../types";
import { List, Toast, showToast } from "@raycast/api";
import { TRANSPORT_MODES, TRANSPORT_MODE_TO_ICON } from "../lib/constants";
import { getDepartures } from "../lib/departures";
import { getTransportModeIcon, uppercaseFirst } from "../lib/utils";
import { useState } from "react";

interface StationProps {
  station: IStation;
}

export default function Departures({ station }: StationProps) {
  // Local state
  const [transportMode, setTransportMode] = useState<string>("all");

  // Server state
  const { data, isLoading, mutate, isValidating } = useSWR(
    [station.SiteId, "departures"],
    () => getDepartures(station.SiteId),
    {
      refreshInterval: 10 * 1000, // 10 sec
      onError: (error) => {
        showToast({
          title: error.response?.data?.title || "Failed to retrieve departures",
          message: error.response?.data?.description,
          style: Toast.Style.Failure,
        });
      },
    }
  );

  return (
    <List
      searchBarPlaceholder={`Search departures from ${station.Name}`}
      isLoading={isLoading || isValidating}
      navigationTitle={station.Name}
      searchBarAccessory={
        <List.Dropdown onChange={setTransportMode} placeholder="Metros" tooltip="Transport mode" value={transportMode}>
          <List.Dropdown.Item title="All" value="all" key="all" />

          {TRANSPORT_MODES.map((TRANSPORT_MODE) => {
            return (
              <List.Dropdown.Item
                icon={TRANSPORT_MODE_TO_ICON[TRANSPORT_MODE.innerValue]}
                title={TRANSPORT_MODE.outerValue}
                value={TRANSPORT_MODE.outerValue}
                key={TRANSPORT_MODE.outerValue}
              />
            );
          })}
        </List.Dropdown>
      }
    >
      {data &&
        Object.entries(data)
          .filter(([tm]) => (transportMode === "all" ? true : tm === transportMode))
          .map(([transportMode, departures]) => (
            <List.Section key={transportMode} title={uppercaseFirst(transportMode.toLowerCase())}>
              {departures.map((departure) => (
                <Departure
                  key={departure.JourneyNumber}
                  departure={departure}
                  onRefresh={() => {
                    mutate();
                  }}
                />
              ))}
            </List.Section>
          ))}

      <List.EmptyView icon={getTransportModeIcon(transportMode)} title="No departures found" />
    </List>
  );
}
