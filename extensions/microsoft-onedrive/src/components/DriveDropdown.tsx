import { Icon, List } from "@raycast/api";
import type { Drive } from "../types";

interface DriveDropdownProps {
  oneDriveDrives: Drive[];
  sharepointSites: [string, Drive[]][];
  selectedDriveId: string | null;
  onDriveChange: (driveId: string) => void;
}

export function DriveDropdown({ oneDriveDrives, sharepointSites, selectedDriveId, onDriveChange }: DriveDropdownProps) {
  return (
    <List.Dropdown
      tooltip="Select a drive or document library to browse"
      value={selectedDriveId ?? undefined}
      onChange={onDriveChange}
    >
      {oneDriveDrives.map((drive) => (
        <List.Dropdown.Item key={drive.id} title={drive.name} value={drive.id} icon={Icon.Person} />
      ))}

      {sharepointSites.map(([siteName, siteDrives]) => (
        <List.Dropdown.Section key={siteName} title={siteName}>
          {siteDrives.map((drive) => (
            <List.Dropdown.Item key={drive.id} title={drive.name} value={drive.id} icon={Icon.Building} />
          ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
}
