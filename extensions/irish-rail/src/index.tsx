import { Action, ActionPanel, Form, List } from "@raycast/api";
import { Train, getTrains } from "./trains";
import { getStations } from "./stations";
import { useState, useEffect } from "react";

function GetTimesForm() {
  const [trainsData, setTrainsData] = useState<Train[] | null>(null);
  const [stations, setStations] = useState<string[] | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [searchString, setSearchString] = useState<string>("");

  const handleSubmit = async (values: { origin: string; destination: string }) => {
    setOrigin(values.origin);
    setDestination(values.destination);
    const trains = await getTrains(values.origin, values.destination);
    setTrainsData(trains);
  };

  const options = () => {
    return stations?.map((station, index) => <Form.Dropdown.Item key={index} value={station} title={station} />);
  };

  const dueTime = (train: Train) => {
    const now = new Date();
    const dueInMinutes = parseInt(train.dueIn);
    return (
      new Date(now.getTime() + dueInMinutes * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
      " (est)"
    );
  };

  const friendlyTime = (train: Train) => {
    return train.expDepart === "00:00" ? dueTime(train) : train.expDepart;
  };

  const getIcon = (dueIn: string) => {
    const dueInInt = parseInt(dueIn);
    if (dueInInt <= 2) {
      return { source: "red-warning.png" };
    } else if (dueInInt <= 5) {
      return { source: "orange-warning.png" };
    } else {
      return { source: "green-clock.png" };
    }
  };

  const trainInfoView = (train: Train, index: number) => {
    const { destination, trainCode, destinationTime, dueIn, origin } = train;
    return (
      <List.Item
        icon={getIcon(train.dueIn)}
        key={index}
        id={trainCode}
        title={`Due: ${dueIn} minute` + (Number(dueIn) === 1 ? "" : "s")}
        subtitle={`Origin: ${origin}`}
        accessories={[
          { tag: `Destination: ${destination}` },
          { text: `Departure: ${friendlyTime(train)}` },
          { text: `ETA: ${destinationTime}` },
        ]}
      />
    );
  };

  const searchTrain = (train: Train) => {
    const match = (data: string) => {
      return data.toLowerCase().includes(searchString.toLowerCase());
    };

    const matchingDestinations = match(train.destination);
    const matchingTrainCode = match(train.trainCode);
    const matchingTime = match(train.expDepart);

    return matchingDestinations || matchingTrainCode || matchingTime;
  };

  const search = async (text: string) => {
    setSearchString(text === "" ? searchString.slice(0, -1) : text);
    const trains = await getTrains(origin ?? "", destination ?? "");
    const filteredTrains = trains?.filter((train) => searchTrain(train));
    setTrainsData(filteredTrains ?? null);
  };

  const formView = () => {
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
        <Form.Dropdown id="destination" title="Destination (Optional)">
          <Form.Dropdown.Item value="" title="Select..." />
          {options()}
        </Form.Dropdown>
      </Form>
    );
  };

  const trainsView = () => {
    return (
      <List isLoading={false} filtering={false} onSearchTextChange={search}>
        <List.Section title={`Station: ${origin ?? "Trains"}`}>
          {trainsData?.map((train, index) => trainInfoView(train, index))}
        </List.Section>
      </List>
    );
  };

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
