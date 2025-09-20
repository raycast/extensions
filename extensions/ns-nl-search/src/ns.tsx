import { useCallback, useState } from "react";
import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useStationSearch } from "./api/client";
import { Trips } from "./components/Trips";

export type Trip = {
  id: string;
  from: string;
  to: string;
};

export default function Command() {
  const { push } = useNavigation();
  const [fromStationQuery, setFromStationQuery] = useState<string>("Amsterdam Centraal");
  const [toStationQuery, setToStationQuery] = useState<string>("Rotterdam Centraal");

  const { data: fromStations, isLoading: fromStationsIsLoading } = useStationSearch(fromStationQuery);
  const { data: toStations, isLoading: toStationsIsLoading } = useStationSearch(toStationQuery);

  const searchTrips = useCallback((val: Form.Values) => {
    push(
      <Trips
        fromStation={val["from"]}
        toStation={val["to"]}
        searchArrival={val["direction"] === "arrival"}
        date={val["when"]}
      />,
    );
  }, []);

  const now = new Date();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search Trips" onSubmit={searchTrips} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="from"
        title="From"
        filtering
        throttle
        onSearchTextChange={setFromStationQuery}
        isLoading={fromStationsIsLoading}
      >
        {(fromStations || { payload: [] }).payload.map((station) => {
          return (
            <Form.Dropdown.Item
              key={station.UICCode}
              value={station.UICCode}
              title={station.namen?.lang || station.UICCode}
            />
          );
        })}
      </Form.Dropdown>

      <Form.Dropdown
        id="to"
        title="To"
        filtering
        throttle
        onSearchTextChange={setToStationQuery}
        isLoading={toStationsIsLoading}
      >
        {(toStations || { payload: [] }).payload.map((station) => (
          <Form.Dropdown.Item
            key={station.UICCode}
            value={station.UICCode}
            title={station.namen?.lang || station.UICCode}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />
      <Form.Dropdown id="direction" title="Time to" defaultValue="departure">
        <Form.Dropdown.Item key="departure" value="departure" title="Departure" />
        <Form.Dropdown.Item key="arrival" value="arrival" title="Arrival" />
      </Form.Dropdown>
      <Form.DatePicker
        id="when"
        title="Date"
        defaultValue={new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes())}
      />
    </Form>
  );
}
