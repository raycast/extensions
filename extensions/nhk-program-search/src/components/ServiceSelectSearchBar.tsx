import { List } from "@raycast/api";
import React from "react";
import { ServiceId, serviceIdLabels, serviceIdLogos, serviceIds } from "../types";

type Props = { onChange: (newValue: ServiceId) => void; canSelectAll: boolean };

export function SearchBarDropdown({ onChange, canSelectAll }: Props): React.JSX.Element {
  return (
    <List.Dropdown
      tooltip="Select a Service"
      storeValue={true}
      onChange={(newValue) => onChange(newValue as ServiceId)}
    >
      {serviceIds
        .filter((sid) => !(sid === "all" && !canSelectAll))
        .map((sid) => {
          return <List.Dropdown.Item key={sid} title={serviceIdLabels[sid]} value={sid} icon={serviceIdLogos[sid]} />;
        })}
    </List.Dropdown>
  );
}
