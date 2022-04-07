import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { useEffect, useState } from "react";
import Track from "./Track";
import { getVendors } from "../../api/api";
import { IVendorData } from "../../model/vendorData";

export default function TrackMain() {
  const [vendors, setVendors] = useState<IVendorData[]>();

  useEffect(() => {
    getVendors().then((response) => setVendors(response.data));
  }, []);

  return (
    <List searchBarPlaceholder="Choose delivery vendor">
      {vendors &&
        vendors.map((vendor) => (
          <List.Item
            key={vendor.code}
            icon={Icon.Circle}
            title={vendor.name}
            actions={
              <ActionPanel>
                <Action.Push title="Next" target={<Track vendorKey={vendor.code} vendorName={vendor.name} />} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
