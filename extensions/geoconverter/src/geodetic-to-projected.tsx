import { ActionPanel, Action, Form } from "@raycast/api";
import { useState } from "react";
import ProjectedList from "./components/ProjectedList";

export default function Command() {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const list = <ProjectedList longitude={longitude} latitude={latitude} />;

  const Actions = (
    <ActionPanel>
      <Action.Push title="Convert" target={list} />
    </ActionPanel>
  );

  return (
    <Form actions={Actions}>
      <Form.TextField
        id="longitude"
        title="Longitude"
        value={longitude}
        onChange={setLongitude}
        placeholder="e.g. 42.3"
      />
      <Form.TextField id="latitude" title="Latitude" value={latitude} onChange={setLatitude} placeholder="e.g. 8.55" />
    </Form>
  );
}
