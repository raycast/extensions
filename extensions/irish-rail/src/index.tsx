import { Action, ActionPanel, Form, List } from "@raycast/api";
import { TrainData, getTrains } from "./trains";
import { getStations } from "./stations";
import { useState, useEffect } from "react";

function GetTimesForm() {
  const [trainsData, setTrainsData] = useState<TrainData[] | null>(null);
  const [stations, setStations] = useState<string[] | null>(null);

  async function handleSubmit(values: { origin: string; destination: string }) {
    const trains = await getTrains(values.origin, values.destination);
    setTrainsData(trains);
  }

  function options() {
    return stations?.map((station, index) => <Form.Dropdown.Item key={index} value={station} title={station} />);
  }

  useEffect(() => {
    async function fetchStations() {
      const stations = await getStations();
      setStations(stations);
    }

    fetchStations();

    if (trainsData !== null) {
      console.log("Trains data:", trainsData);
    }
  }, [trainsData]);

  return trainsData ? (
    <List isLoading={false}>
      {trainsData.map((train, index) => (
        <List.Item
          key={index}
          id={train.Traincode}
          title={`${train.Duein} minutes`}
          subtitle={`From: ${train.Origin}`}
          accessories={[{ tag: `Destination: ${train.Destination}` }, { text: `ETA: ${train.Destinationtime}` }]}
        />
      ))}
    </List>
  ) : (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Times" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="origin" title="Origin">
        {options()}
      </Form.Dropdown>
      <Form.Dropdown id="destination" title="Destination">
        {options()}
      </Form.Dropdown>
    </Form>
  );
}

export default GetTimesForm;
