import { List } from "@raycast/api";
import React from "react";
import { preferences } from "../preferences";
import { ServiceId, serviceIdLabels, serviceIdLogos, serviceIds } from "../types";

type Props = {
  onChange: (newValue: ServiceId) => void;
  canSelectAll: boolean;
};

export function SearchBarDropdown({ onChange, canSelectAll }: Props): React.JSX.Element {
  return (
    <List.Dropdown
      tooltip="Select a Service"
      storeValue={true}
      onChange={(newValue) => onChange(newValue as ServiceId)}
    >
      {serviceIds
        .filter((sid) => preferences.services.includes(sid) || (canSelectAll && sid === "all"))
        .map((sid) => (
          <List.Dropdown.Item key={sid} title={serviceIdLabels[sid]} value={sid} icon={serviceIdLogos[sid]} />
        ))}
    </List.Dropdown>
  );
}
