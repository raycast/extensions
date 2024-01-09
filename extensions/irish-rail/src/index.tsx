import { Action, ActionPanel, Form, List } from "@raycast/api";
import { Train, getTrains } from "./trains";
import { useState, useEffect } from "react";

function GetTimesForm() {
  const [trainsData, setTrainsData] = useState<Train[] | null>(null);

  async function handleSubmit(values: { origin: string; destination: string }) {
    const trains = await getTrains(values.origin, values.destination);
    setTrainsData(trains);
  }

  useEffect(() => {
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
      <Form.TextField id="origin" title="Origin" defaultValue="Dublin Pearse" />
      <Form.TextField id="destination" title="Destination" defaultValue="Maynooth" />
    </Form>
  );
}

export default GetTimesForm;
