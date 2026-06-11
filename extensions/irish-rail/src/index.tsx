import { Action, ActionPanel, Form, List } from "@raycast/api";
import { Train, getTrains, getReachableDestinations } from "./trains";
import { getStations } from "./stations";
import { useState, useEffect, useMemo } from "react";

function GetTimesForm() {
  const [trainsData, setTrainsData] = useState<Train[] | null>(null);
  const [stations, setStations] = useState<string[] | null>(null);
  const [availableDestinations, setAvailableDestinations] = useState<string[] | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);

  useEffect(() => {
    getStations().then(setStations);
  }, []);

  const handleSubmit = async (values: { origin: string; destination: string }) => {
    setOrigin(values.origin);
    const trains = await getTrains(values.origin, values.destination);
    setTrainsData(trains);
  };

  const handleOriginChange = async (newOrigin: string) => {
    setAvailableDestinations(null);
    if (newOrigin) {
      setIsLoadingDestinations(true);
      const destinations = await getReachableDestinations(newOrigin);
      setAvailableDestinations(destinations);
      setIsLoadingDestinations(false);
    }
  };

  const filteredTrains = useMemo(() => {
    if (!trainsData || !searchText) return trainsData;

    const query = searchText.toLowerCase();
    return trainsData.filter(
      (train) =>
        train.destination.toLowerCase().includes(query) ||
        train.trainCode.toLowerCase().includes(query) ||
        train.expDepart.includes(query),
    );
  }, [trainsData, searchText]);

  const renderDropdownOptions = (items: string[] | null) =>
    items?.map((item, index) => <Form.Dropdown.Item key={index} value={item} title={item} />);

  const getIcon = (dueIn: string) => {
    const minutes = parseInt(dueIn);
    if (minutes <= 2) return { source: "red-warning.png" };
    if (minutes <= 5) return { source: "orange-warning.png" };
    return { source: "green-clock.png" };
  };

  const formatDepartureTime = (train: Train) => {
    if (train.expDepart !== "00:00") return train.expDepart;

    const departureDate = new Date(Date.now() + parseInt(train.dueIn) * 60000);
    return departureDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " (est)";
  };

  const renderTrainItem = (train: Train, index: number) => (
    <List.Item
      key={index}
      id={train.trainCode}
      icon={getIcon(train.dueIn)}
      title={`Due: ${train.dueIn} minute${train.dueIn === "1" ? "" : "s"}`}
      accessories={[
        { tag: `From: ${train.origin}` },
        { tag: `To: ${train.destination}` },
        { text: `Dep: ${formatDepartureTime(train)}` },
        { text: `ETA: ${train.destinationTime}` },
      ]}
    />
  );

  const formView = () => (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Times" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="origin" title="Origin" onChange={handleOriginChange}>
        {renderDropdownOptions(stations)}
      </Form.Dropdown>
      <Form.Dropdown id="destination" title="Destination (Optional)">
        <Form.Dropdown.Item value="" title={isLoadingDestinations ? "Loading destinations..." : "Select..."} />
        {renderDropdownOptions(availableDestinations ?? stations)}
      </Form.Dropdown>
    </Form>
  );

  const trainsView = () => (
    <List isLoading={false} filtering={false} onSearchTextChange={setSearchText}>
      <List.Section title={`Station: ${origin ?? "Trains"}`}>{filteredTrains?.map(renderTrainItem)}</List.Section>
    </List>
  );

  return trainsData ? trainsView() : formView();
}

export default GetTimesForm;
