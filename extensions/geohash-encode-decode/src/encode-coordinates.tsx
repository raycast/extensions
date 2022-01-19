import { ActionPanel, PushAction, Form } from "@raycast/api";
import { useState } from "react";
import EncodedList from "./components/EncodedList";

export default function EncodeCoordinates() {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const list = <EncodedList latitude={latitude} longitude={longitude} />;

  const Actions = (
    <ActionPanel>
      <PushAction title="Encode Coordinates" target={list} />
    </ActionPanel>
  );

  return (
    <Form actions={Actions}>
      <Form.TextField
        id="latitude"
        title="Latitude"
        value={latitude}
        onChange={setLatitude}
        placeholder="E.g., 40.4169"
      />
      <Form.TextField
        id="longitude"
        title="Longitude"
        value={longitude}
        onChange={setLongitude}
        placeholder="E.g., -3.7035"
      />
    </Form>
  );
}
