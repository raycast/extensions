import {
  Form,
  ActionPanel,
  Icon,
  OpenInBrowserAction,
  CopyToClipboardAction,
  getPreferenceValues,
  popToRoot,
} from "@raycast/api";
import { useState } from "react";
import { TravelMode, makeDirectionsURL, Preferences } from "./utils";

enum orginOption {
  CurLoc = "",
  Home = "home",
  Custom = "custom",
}

export default function Command() {
  const preferences: Preferences = getPreferenceValues();

  // Used to handle what the Form displays.
  const [origin, setOrigin] = useState<string>("");
  // Used to handle what is submitted to the Google Maps API.
  const [originAddress, setOriginAddress] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [mode, setMode] = useState<string>(preferences.preferredMode);

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
      actions={
        <ActionPanel>
          <OpenInBrowserAction
            url={makeDirectionsURL(originAddress, destination, mode)}
            icon={Icon.Globe}
            onOpen={() => popToRoot()}
          />
          <CopyToClipboardAction
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
        <Form.DropdownItem value={orginOption.CurLoc} title="Current Location" icon="📍" />
        <Form.DropdownItem value={orginOption.Home} title="Home" icon="🏠" />
        <Form.DropdownItem value={orginOption.Custom} title="Custom Address" icon="✏️" />
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
        <Form.DropdownItem value={TravelMode.Driving} title="Car" icon="🚗" />
        <Form.DropdownItem value={TravelMode.Transit} title="Public Transport" icon="🚆" />
        <Form.DropdownItem value={TravelMode.Walking} title="Walk" icon="🚶‍♀️" />
        <Form.DropdownItem value={TravelMode.Bicycling} title="Bike" icon="🚲" />
      </Form.Dropdown>
    </Form>
  );
}
