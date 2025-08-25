import { Action, ActionPanel, Form, getPreferenceValues, Icon, popToRoot } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { fetchItemInput } from "./utils/input";
import { Preferences, TransportType, OriginOption } from "./types";
import { makeDirectionsURL } from "./utils/url";
import { showFailureToast } from "@raycast/utils";

export default function Command() {
  // Get user preferences
  const preferences = getPreferenceValues<Preferences>();

  // State variables
  const [origin, setOrigin] = useState<OriginOption>(preferences.preferredOrigin); // Controls which origin option is selected
  const [originAddress, setOriginAddress] = useState<string>(
    preferences.preferredOrigin === OriginOption.Home ? preferences.homeAddress : ""
  ); // Stores the origin address
  const [destination, setDestination] = useState<string>(""); // Stores the destination address
  const [mode, setMode] = useState<TransportType>(preferences.preferredMode); // Stores the selected transport mode
  const [isLoading, setIsLoading] = useState<boolean>(preferences.useSelected); // Controls loading state

  // Handle changes to the origin dropdown
  const handleOriginChange = useCallback(
    (value: string) => {
      // Validate that value is a valid OriginOption
      const isValidOriginOption = Object.values(OriginOption).includes(value as OriginOption);
      if (!isValidOriginOption) {
        console.warn(`Invalid origin option: ${value}`);
        return;
      }

      // Since we've already validated that value is a valid OriginOption, we can use it directly
      const originOption = value as OriginOption;
      setOrigin(originOption);
      if (originOption === OriginOption.Home) {
        setOriginAddress(preferences.homeAddress);
      } else if (originOption === OriginOption.Custom) {
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
          showFailureToast("Error fetching input", { message: String(error) });
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    }

    autoFillDestination();
  }, [preferences.useSelected]);

  const [error, setError] = useState<string | undefined>();

  // Check if the form is valid
  const isFormValid = !!destination?.trim();

  // Format the URL with the current state
  const directionsURL = isFormValid ? makeDirectionsURL(originAddress, destination, mode) : "";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {isFormValid ? (
            <>
              <Action.OpenInBrowser
                url={directionsURL}
                icon={Icon.Globe}
                title="Open in Browser"
                onOpen={() => popToRoot()}
              />
              <Action.CopyToClipboard
                content={directionsURL}
                icon={Icon.Clipboard}
                title="Copy URL to Clipboard"
                onCopy={() => popToRoot()}
              />
            </>
          ) : (
            <Action
              title="Enter a Destination"
              icon={Icon.ExclamationMark}
              onAction={() => setError("Destination is required")}
            />
          )}
        </ActionPanel>
      }
    >
      {/* Destination input field */}
      <Form.TextField
        id="destination"
        title="Destination"
        placeholder="Name or Address"
        value={destination}
        onChange={(value) => {
          setDestination(value);
          // Clear error when user starts typing
          if (error) setError(undefined);
        }}
        error={error}
      />
      <Form.Separator />
      {/* Origin selection dropdown */}
      <Form.Dropdown id="origin" title="Starting from" value={origin} onChange={handleOriginChange}>
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
      <Form.Dropdown
        id="transportType"
        title="Transport Preference"
        value={mode}
        onChange={(newValue) => {
          // Type guard to ensure the value is a valid TransportType
          if (Object.values(TransportType).includes(newValue as TransportType)) {
            setMode(newValue as TransportType);
          } else {
            console.warn(`Invalid transport type: ${newValue}`);
          }
        }}
      >
        <Form.Dropdown.Item value={TransportType.Driving} title="Driving" icon={Icon.Car} />
        <Form.Dropdown.Item value={TransportType.Transit} title="Transit" icon={Icon.Train} />
        <Form.Dropdown.Item value={TransportType.Walking} title="Walking" icon={Icon.Footprints} />
        <Form.Dropdown.Item value={TransportType.Cycling} title="Cycling" icon={Icon.Bike} />
      </Form.Dropdown>
    </Form>
  );
}
