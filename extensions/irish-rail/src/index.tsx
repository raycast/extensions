import { Action, ActionPanel, Form, List } from "@raycast/api";
import { TrainData, getTrains } from "./trains";
import { getStations } from "./stations";
import { useState, useEffect } from "react";

function GetTimesForm() {
  const [trainsData, setTrainsData] = useState<TrainData[] | null>(null);
  const [stations, setStations] = useState<string[] | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);

  async function handleSubmit(values: { origin: string; destination: string }) {
    const trains = await getTrains(values.origin, values.destination);
    setTrainsData(trains);
    setOrigin(values.origin);
  }

  function options() {
    return stations?.map((station, index) => <Form.Dropdown.Item key={index} value={station} title={station} />);
  }

  function trainInfoView(train: TrainData, index: number) {
    const { Destination, Traincode, Destinationtime, Duein, Origin } = train;
    return (
      <List.Item
        key={index}
        id={Traincode}
        title={`${Duein} minutes`}
        subtitle={`Origin: ${Origin}`}
        accessories={[{ tag: `Destination: ${Destination}` }, { text: `ETA: ${Destinationtime}` }]}
      />
    );
  }

  function formView() {
    return (
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
          <Form.Dropdown.Item value="" title="Select..." />
          {options()}
        </Form.Dropdown>
      </Form>
    );
  }

  function trainsView() {
    return (
      <List isLoading={false}>
        <List.Section title={`Station: ${origin ?? "Trains"}`}>
          {trainsData?.map((train, index) => {
            return trainInfoView(train, index);
          })}
        </List.Section>
      </List>
    );
  }

  useEffect(() => {
    async function fetchStations() {
      const stations = await getStations();
      setStations(stations);
    }

    fetchStations();
  }, [trainsData]);

  return trainsData ? trainsView() : formView();
}

export default GetTimesForm;
