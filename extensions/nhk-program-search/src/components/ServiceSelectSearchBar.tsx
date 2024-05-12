import { List } from "@raycast/api";
import React from "react";
import { ServiceId, serviceIdLabels, serviceIdLogos, serviceIds } from "../types";

export function SearchBarDropdown({ onChange }: { onChange: (newValue: ServiceId) => void }): React.JSX.Element {
  return (
    <List.Dropdown
      tooltip="Select a Service"
      storeValue={true}
      onChange={(newValue) => onChange(newValue as ServiceId)}
    >
      {serviceIds.map((sid) => {
        return <List.Dropdown.Item key={sid} title={serviceIdLabels[sid]} value={sid} icon={serviceIdLogos[sid]} />;
      })}
    </List.Dropdown>
  );
}
