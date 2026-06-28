import { Form, ActionPanel, Icon, getPreferenceValues, popToRoot, Action } from "@raycast/api";
import { useState } from "react";
import { TransportType, makePlatformDirectionsURL, Preferences } from "./utils";

enum orginOption {
  Home = "home",
  CurLoc = "",
  Custom = "custom",
}

export default function Command() {
  const preferences: Preferences = getPreferenceValues();

  // Used to handle what the Form displays.
  const [origin, setOrigin] = useState<string>("home");
  // Used to handle what is submitted to the Apple Maps API.
  const [originAddress, setOriginAddress] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [mode, setMode] = useState<string>(preferences.preferredMode);

  const handleOriginChange = (value: string) => {
    if (value === orginOption.Home) {
      setOriginAddress(preferences.homeAddress);
      setOrigin(orginOption.Home);
    } else if (value === orginOption.CurLoc) {
      setOriginAddress("");
      setOrigin(orginOption.CurLoc);
    } else {
      setOriginAddress("");
      setOrigin(orginOption.Custom);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={destination ? makePlatformDirectionsURL(originAddress, destination, mode) : ""}
            icon={Icon.Map}
            title="Open in Apple Maps"
            onOpen={() => popToRoot()}
          />
          <Action.CopyToClipboard
            content={destination ? makePlatformDirectionsURL(originAddress, destination, mode) : ""}
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
        <Form.Dropdown.Item value={orginOption.Home} title="Home" icon={Icon.House} />
        <Form.Dropdown.Item value={orginOption.CurLoc} title="Current Location" icon={Icon.Geopin} />
        <Form.Dropdown.Item value={orginOption.Custom} title="Custom Address" icon={Icon.Pencil} />
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
      <Form.Dropdown id="transport-type" title="Transport Type" value={mode} onChange={setMode}>
        <Form.Dropdown.Item value={TransportType.Driving} title="Driving" icon={Icon.Car} />
        <Form.Dropdown.Item value={TransportType.Walking} title="Walking" icon={Icon.Footprints} />
        <Form.Dropdown.Item value={TransportType.Transit} title="Transit" icon={Icon.Train} />
        <Form.Dropdown.Item value={TransportType.Cycling} title="Cycling" icon={Icon.Bike} />
      </Form.Dropdown>
    </Form>
  );
}
