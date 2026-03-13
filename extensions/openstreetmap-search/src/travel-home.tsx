import { Action, ActionPanel, Form, getPreferenceValues, Icon, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { getInputText } from "./utils";
import { Preferences, TRAVEL_MODE } from "./interfaces";
import { makeDirectionsURL } from "./utils";

export default function Command() {
  const preferences: Preferences = getPreferenceValues();
  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [mode, setMode] = useState<string>(preferences.preferredMode);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function getInput() {
      const inputItem = await getInputText();
      setOrigin(inputItem);
      setIsLoading(false);
    }
    setDestination(preferences.homeAddress);
    getInput().then();
  }, []);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={makeDirectionsURL(origin, destination, mode)}
            icon={Icon.Globe}
            onOpen={() => popToRoot()}
          />
          <Action.CopyToClipboard
            content={makeDirectionsURL(origin, destination, mode)}
            icon={Icon.Clipboard}
            onCopy={() => popToRoot()}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="destination" title="Destination" value={destination} />
      <Form.Separator />
      <Form.TextField
        autoFocus={true}
        id="originAddress"
        title="Origin Address"
        placeholder="Name or Address"
        value={origin}
        onChange={setOrigin}
      />
      <Form.Dropdown id="travelmode" title="Travel Mode" value={mode} onChange={setMode}>
        <Form.Dropdown.Item value={TRAVEL_MODE.DRIVING_OSM} title="Car(OSM)" icon="🚗" />
        <Form.Dropdown.Item value={TRAVEL_MODE.DRIVING_GHP} title="Car(GHP)" icon="🚗" />
        <Form.Dropdown.Item value={TRAVEL_MODE.WALKING_OSM} title="Walk(OSM)" icon="🚶‍♀" />
        <Form.Dropdown.Item value={TRAVEL_MODE.WALKING_GHP} title="Walk(GHP)" icon="🚶‍♀" />
        <Form.Dropdown.Item value={TRAVEL_MODE.BICYCLING_OSM} title="Bike(OSM)" icon="🚲" />
        <Form.Dropdown.Item value={TRAVEL_MODE.BICYCLING_GHP} title="Bike(GHP)" icon="🚲" />
      </Form.Dropdown>
    </Form>
  );
}
