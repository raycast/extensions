import { Action, ActionPanel, Form, getPreferenceValues, Icon, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchItemInput } from "./utils/input";
import { Preferences, PlaceType } from "./utils/types";
import { makeSearchURL } from "./utils/url";

/* The form's origin options. */
enum OrginOption {
  CurLoc = "curloc",
  Custom = "custom",
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  // Used to handle what the Form displays.
  const [origin, setOrigin] = useState<OrginOption>(OrginOption.CurLoc);
  // Used to handle what is submitted to the Google Maps API.
  const [originAddress, setOriginAddress] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [placeType, setPlaceType] = useState<string>(preferences.preferredMode);
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
            url={makeSearchURL(originAddress, placeType)}
            icon={Icon.Globe}
            onOpen={() => popToRoot()}
          />
          <Action.CopyToClipboard
            content={makeSearchURL(originAddress, placeType)}
            icon={Icon.Clipboard}
            onCopy={() => popToRoot()}
          />
        </ActionPanel>
      }
    >
      <Form.Separator />
      <Form.Dropdown id="origin" title="From" value={origin} onChange={handleOriginChange}>
        <Form.Dropdown.Item value={OrginOption.CurLoc} title="Current Location" icon="📍" />
        {/* <Form.Dropdown.Item value={OrginOption.Custom} title="Custom Address" icon="✏️" /> */}
      </Form.Dropdown>
      {/* {origin === OrginOption.Custom && (
        <Form.TextField
          id="originAddress"
          title="Address"
          placeholder="Name or Address"
          value={originAddress}
          onChange={setOriginAddress}
        />
      )} */}
      <Form.Dropdown id="placetype" title="Find" value={placeType} onChange={setPlaceType}>
        <Form.Dropdown.Item value={PlaceType.Park} title="Park" icon="🌳" />
        <Form.Dropdown.Item value={PlaceType.Cafe} title="Cafe" icon="☕" />
        <Form.Dropdown.Item value={PlaceType.Japan} title="Japanese Resturant" icon="🇯🇵" />
        <Form.Dropdown.Item value={PlaceType.Thai} title="Thai Resturant" icon="🇹🇭" />
      </Form.Dropdown>
    </Form>
  );
}
