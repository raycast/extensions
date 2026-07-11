import { Action, ActionPanel, Form, getPreferenceValues, Icon, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { getInputText } from "./utils";
import { STARTING_POINT, Preferences, TRAVEL_MODE } from "./interfaces";
import { makeDirectionsURL } from "./utils";

export default function Command() {
  const preferences: Preferences = getPreferenceValues();
  const [origin, setOrigin] = useState<string>("");
  const [originAddress, setOriginAddress] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [mode, setMode] = useState<string>(preferences.preferredMode);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function getInput() {
      const inputItem = await getInputText();
      setDestination(inputItem);
      setIsLoading(false);
    }

    getInput().then();
  }, []);

  const handleOriginChange = (value: string) => {
    switch (value) {
      case STARTING_POINT.CUSTOM_LOCATION:
        setOrigin(STARTING_POINT.CUSTOM_LOCATION);
        setOriginAddress("");
        break;
      case STARTING_POINT.HOME:
        setOrigin(STARTING_POINT.HOME);
        setOriginAddress(preferences.homeAddress);
        break;
      default:
        break;
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={makeDirectionsURL(originAddress, destination, mode)}
            icon={Icon.Globe}
            onOpen={() => popToRoot()}
          />
          <Action.CopyToClipboard
            content={makeDirectionsURL(originAddress, destination, mode)}
            icon={Icon.Clipboard}
            onCopy={() => popToRoot()}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="destination"
        title="Destination"
        placeholder="Name or Address"
        value={destination}
        onChange={setDestination}
      />
      <Form.Separator />
      <Form.Dropdown id="origin" title="Origin" value={origin} onChange={handleOriginChange}>
        <Form.Dropdown.Item value={STARTING_POINT.HOME} title="Home" icon="🏠" />
        <Form.Dropdown.Item value={STARTING_POINT.CUSTOM_LOCATION} title="Custom Address" icon="✏️" />
      </Form.Dropdown>
      {origin === STARTING_POINT.CUSTOM_LOCATION && (
        <Form.TextField
          id="originAddress"
          title="Origin Address"
          placeholder="Name or Address"
          value={originAddress}
          onChange={setOriginAddress}
        />
      )}
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
