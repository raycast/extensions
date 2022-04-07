import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { useState } from "react";
<<<<<<< HEAD
import { IVendorData } from "../../model/vendorData";
=======
import { findVendorByCode, IVendor } from "../../metadata/logistics";
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
import Track from "../track/Track";

interface IProps {
  itemKey: string;
  itemName: string;
<<<<<<< HEAD
  vendor: IVendorData | null;
=======
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
  isComplete: boolean;
  handleRemove: (key: string) => void;
}

<<<<<<< HEAD
const PackageItem = ({ itemKey, itemName, vendor, isComplete, handleRemove }: IProps) => {
  const [trackNumber, setTrackNumber] = useState<string>(itemKey.split("-")[1]);

  return (
    <>
      {vendor && (
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
      )}
    </>
=======
const PackageItem = ({ itemKey, itemName, isComplete, handleRemove }: IProps) => {
  const [trackNumber, setTrackNumber] = useState<string>(itemKey.split("-")[1]);
  const [vendor, setVendor] = useState<IVendor>(findVendorByCode(itemKey.split("-")[0]));

  return (
    <List.Item
      key={itemKey}
      icon={isComplete ? Icon.Checkmark : Icon.Circle}
      title={itemName}
      subtitle={trackNumber}
      actions={
        <ActionPanel>
          <Action.Push
            title="Tracking"
            target={<Track vendorKey={vendor.code} vendorName={vendor.name} defaultTrackNumber={trackNumber} />}
          />
          <Action title="Remove Item" onAction={() => handleRemove(itemKey)} />
        </ActionPanel>
      }
      accessories={[
        {
          text: vendor.name,
        },
      ]}
    />
>>>>>>> fd15f1875e1ac440633d4a65ab41f390d5c44e35
  );
};

export default PackageItem;
