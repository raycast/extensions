import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { IVendorData } from "../../model/vendorData";
import Track from "../track/Track";

interface IProps {
  itemKey: string;
  itemName: string;
  vendor: IVendorData | null;
  isComplete: boolean;
  handleRemove: (key: string) => void;
}

const PackageItem = ({ itemKey, itemName, vendor, isComplete, handleRemove }: IProps) => {
  const [trackNumber] = useState<string>(itemKey.split("-")[1]);

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
  );
};

export default PackageItem;
