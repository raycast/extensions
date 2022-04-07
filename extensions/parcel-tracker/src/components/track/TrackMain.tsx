import { Action, ActionPanel, Icon, List } from "@raycast/api";
<<<<<<< HEAD
import React, { useEffect, useState } from "react";
import Track from "./Track";
import { getVendors } from "../../api/api";
import { IVendorData } from "../../model/vendorData";

export default function TrackMain() {
  const [vendors, setVendors] = useState<IVendorData[]>();

  useEffect(() => {
    getVendors().then((response) => setVendors(response.data));
  }, []);
=======
import { logistics } from "../../metadata/logistics";
import Track from "./Track";

export default function TrackMain() {
  const vendors = logistics;
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35

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
