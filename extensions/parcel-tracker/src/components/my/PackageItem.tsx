import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { useState } from "react";
import { findVendorByCode, IVendor } from "../../metadata/logistics";
import Track from "../track/Track";

interface IProps {
  itemKey: string;
  itemName: string;
  isComplete: boolean;
  handleRemove: (key: string) => void;
}

const PackageItem = ({ itemKey, itemName, isComplete, handleRemove }: IProps) => {
  const [trackNumber, setTrackNumber] = useState<string>(itemKey.split("-")[1]);
  const [vendor, setVendor] = useState<IVendor>(findVendorByCode(itemKey.split("-")[0]));

  return (
    <List.Item
      key={itemKey}
      icon={isComplete ? Icon.Checkmark : Icon.Circle}
      title={itemName}
      subtitle={trackNumber}
      accessoryTitle={vendor.name}
      actions={
        <ActionPanel>
          <Action.Push
            title="Tracking"
            target={<Track vendorKey={vendor.code} vendorName={vendor.name} defaultTrackNumber={trackNumber} />}
          />
          <Action title="Remove Item" onAction={() => handleRemove(itemKey)} />
        </ActionPanel>
      }
    />
  );
};

export default PackageItem;
