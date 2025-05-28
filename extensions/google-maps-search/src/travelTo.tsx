import { Action, ActionPanel, Form, getPreferenceValues, Icon, popToRoot } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { fetchItemInput } from "./utils/input";
import { Preferences, TransportType, OriginOption } from "./utils/types";
import { makeDirectionsURL } from "./utils/url";

export default function Command() {
  // Get user preferences
  const preferences = getPreferenceValues<Preferences>();

  // State variables
  const [origin, setOrigin] = useState<OriginOption>(preferences.preferredOrigin); // Controls which origin option is selected
  const [originAddress, setOriginAddress] = useState<string>(""); // Stores the origin address
  const [destination, setDestination] = useState<string>(""); // Stores the destination address
  const [mode, setMode] = useState<string>(preferences.preferredMode); // Stores the selected transport mode
  const [isLoading, setIsLoading] = useState<boolean>(preferences.useSelected); // Controls loading state

  // Handle changes to the origin dropdown
  const handleOriginChange = useCallback(
    (value: string) => {
      const newOrigin = value as OriginOption;
      setOrigin(newOrigin);
      if (newOrigin === OriginOption.CurLoc) {
        setOriginAddress("");
      } else if (newOrigin === OriginOption.Home) {
        setOriginAddress(preferences.homeAddress);
      } else {
        setOriginAddress("");
      }
    },
    [preferences.homeAddress]
  );

  // Effect to auto-fill destination if useSelected preference is true
  useEffect(() => {
    async function autoFillDestination() {
      if (preferences.useSelected) {
        try {
          const inputItem = await fetchItemInput();
          setDestination(inputItem);
        } catch (error) {
          console.error("Error fetching input:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    }

    autoFillDestination();
  }, [preferences.useSelected]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {/* Action to open directions in browser */}
          <Action.OpenInBrowser
            url={makeDirectionsURL(originAddress, destination, mode)}
            icon={Icon.Globe}
            onOpen={() => popToRoot()}
          />
          {/* Action to copy directions URL to clipboard */}
          <Action.CopyToClipboard
            content={makeDirectionsURL(originAddress, destination, mode)}
            icon={Icon.Clipboard}
            onCopy={() => popToRoot()}
          />
        </ActionPanel>
      }
    >
      {/* Destination input field */}
      <Form.TextField
        id="destination"
        title="Destination"
        placeholder="Name or Address"
        value={destination}
        onChange={setDestination}
      />
      <Form.Separator />
      {/* Origin selection dropdown */}
      <Form.Dropdown id="origin" title="Starting from" value={origin} onChange={handleOriginChange}>
        <Form.Dropdown.Item value={OriginOption.CurLoc} title="Current Location" icon={Icon.Pin} />
        <Form.Dropdown.Item value={OriginOption.Home} title="Home" icon={Icon.House} />
        <Form.Dropdown.Item value={OriginOption.Custom} title="Custom Address" icon={Icon.Pencil} />
      </Form.Dropdown>
      {/* Custom origin address input (only shown when Custom is selected) */}
      {origin === OriginOption.Custom && (
        <Form.TextField
          id="originAddress"
          title="Address"
          placeholder="Name or Address"
          value={originAddress}
          onChange={setOriginAddress}
        />
      )}
      {/* Transport mode selection dropdown */}
      <Form.Dropdown id="TransportType" title="Transport Preference" value={mode} onChange={setMode}>
        <Form.Dropdown.Item value={TransportType.Driving} title="Driving" icon={Icon.Car} />
        <Form.Dropdown.Item value={TransportType.Transit} title="Transit" icon={Icon.Train} />
        <Form.Dropdown.Item value={TransportType.Walking} title="Walking" icon={Icon.Footprints} />
        <Form.Dropdown.Item value={TransportType.Cycling} title="Cycling" icon={Icon.Bike} />
      </Form.Dropdown>
    </Form>
  );
}
