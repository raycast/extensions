import { Action, ActionPanel, Form, Icon, popToRoot } from "@raycast/api";
import { useState } from "react";
import { makeSearchURL } from "@/utils/url";
import { PlaceType, OriginOption } from "@/types";

export default function Command() {
  const [origin, setOrigin] = useState<OriginOption>(OriginOption.CurLoc);
  const [originAddress, setOriginAddress] = useState<string>("");
  const [placeType, setPlaceType] = useState<string>(PlaceType.Cafe);

  const handleOriginChange = (value: string) => {
    if (value === OriginOption.CurLoc) {
      setOriginAddress("");
      setOrigin(OriginOption.CurLoc);
    } else {
      setOriginAddress("");
      setOrigin(OriginOption.Custom);
    }
  };

  return (
    <Form
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
        <Form.Dropdown.Item value={OriginOption.CurLoc} title="Current Location" icon="📍" />
        <Form.Dropdown.Item value={OriginOption.Custom} title="Custom Address" icon="✏️" />
      </Form.Dropdown>
      {origin === OriginOption.Custom && (
        <Form.TextField
          id="originAddress"
          title="Address"
          placeholder="Name or Address"
          value={originAddress}
          onChange={setOriginAddress}
        />
      )}
      <Form.Dropdown id="placetype" title="Find" value={placeType} onChange={setPlaceType}>
        <Form.Dropdown.Item value={PlaceType.Park} title="Park" icon="🌳" />
        <Form.Dropdown.Item value={PlaceType.Cafe} title="Cafe" icon="☕" />
        <Form.Dropdown.Item value={PlaceType.JapaneseRestaurant} title="Japanese Restaurant" icon="🇯🇵" />
        <Form.Dropdown.Item value={PlaceType.ThaiRestaurant} title="Thai Restaurant" icon="🇹🇭" />
      </Form.Dropdown>
    </Form>
  );
}
