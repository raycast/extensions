import { Action, ActionPanel, Form, getPreferenceValues, Icon, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchItemInput } from "./utils/input";
import { Preferences, TravelMode } from "./utils/types";
import { makeDirectionsURL } from "./utils/url";

/* The form's origin options. */
enum OrginOption {
  CurLoc = "curloc",
  Home = "home",
  Custom = "custom",
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  // Used to handle what the Form displays.
  const [origin, setOrigin] = useState<OrginOption>(OrginOption.CurLoc);
  // Used to handle what is submitted to the Google Maps API.
  const [originAddress, setOriginAddress] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [mode, setMode] = useState<string>(preferences.preferredMode);
  const [isLoading, setIsLoading] = useState<boolean>(preferences.useSelected);

  // Get highlighted or copied text if preferred.
  useEffect(() => {
    async function _fetchItemInput() {
      const inputItem = await fetchItemInput();
      setDestination(inputItem);
      setIsLoading(false);
    }

    if (preferences.useSelected) {
      _fetchItemInput().then();
    }
  }, []);

  const handleOriginChange = (value: string) => {
    if (value === OrginOption.CurLoc) {
      setOriginAddress("");
      setOrigin(OrginOption.CurLoc);
    } else if (value === OrginOption.Home) {
      setOriginAddress(preferences.homeAddress);
      setOrigin(OrginOption.Home);
    } else {
      setOriginAddress("");
      setOrigin(OrginOption.Custom);
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
        <Form.Dropdown.Item value={OrginOption.CurLoc} title="Current Location" icon="📍" />
        <Form.Dropdown.Item value={OrginOption.Home} title="Home" icon="🏠" />
        <Form.Dropdown.Item value={OrginOption.Custom} title="Custom Address" icon="✏️" />
      </Form.Dropdown>
      {origin === OrginOption.Custom && (
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
