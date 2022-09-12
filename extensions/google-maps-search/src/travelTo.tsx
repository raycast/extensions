import { Action, ActionPanel, Form, getPreferenceValues, Icon, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchItemInput } from "./utils/input";
import { orginOption, Preferences, TravelMode } from "./utils/types";
import { makeDirectionsURL } from "./utils/url";

export default function Command() {
  const preferences: Preferences = getPreferenceValues();

  // Used to handle what the Form displays.
  const [origin, setOrigin] = useState<string>("");
  // Used to handle what is submitted to the Google Maps API.
  const [originAddress, setOriginAddress] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [mode, setMode] = useState<string>(preferences.preferredMode);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function _fetchItemInput() {
      const inputItem = await fetchItemInput();
      setDestination(inputItem);
      setIsLoading(false);
    }

    _fetchItemInput().then();
  }, []);

  const handleOriginChange = (value: string) => {
    if (value === orginOption.CurLoc) {
      setOriginAddress("");
      setOrigin(orginOption.CurLoc);
    } else if (value === orginOption.Home) {
      setOriginAddress(preferences.homeAddress);
      setOrigin(orginOption.Home);
    } else {
      setOriginAddress("");
      setOrigin(orginOption.Custom);
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
        <Form.Dropdown.Item value={orginOption.CurLoc} title="Current Location" icon="📍" />
        <Form.Dropdown.Item value={orginOption.Home} title="Home" icon="🏠" />
        <Form.Dropdown.Item value={orginOption.Custom} title="Custom Address" icon="✏️" />
      </Form.Dropdown>
      {origin === orginOption.Custom && (
        <Form.TextField
          id="originAddress"
          title="Origin Address"
          placeholder="Name or Address"
          value={originAddress}
          onChange={setOriginAddress}
        />
      )}
      <Form.Dropdown id="travelmode" title="Travel Mode" value={mode} onChange={setMode}>
        <Form.Dropdown.Item value={TravelMode.Driving} title="Car" icon="🚗" />
        <Form.Dropdown.Item value={TravelMode.Transit} title="Public Transport" icon="🚆" />
        <Form.Dropdown.Item value={TravelMode.Walking} title="Walk" icon="🚶‍♀️" />
        <Form.Dropdown.Item value={TravelMode.Bicycling} title="Bike" icon="🚲" />
      </Form.Dropdown>
    </Form>
  );
}
