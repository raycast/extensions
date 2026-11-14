import { List } from "@raycast/api";

import { getPackageIcon, getPackageTypeTitle, PACKAGE_TYPES, PackageType } from "../helpers/package";

export const ALL_PACKAGE_TYPES = "all";

type PackageTypeDropdownProps = {
  packageTypes: PackageType[];
  setPackageType: (packageType: string) => void;
};

export default function PackageTypeDropdown({ packageTypes, setPackageType }: PackageTypeDropdownProps) {
  const availableTypes = PACKAGE_TYPES.filter((packageType) => packageTypes.includes(packageType));

  return (
    <List.Dropdown tooltip="Filter by Package Type" storeValue onChange={setPackageType}>
      <List.Dropdown.Item title="All Types" value={ALL_PACKAGE_TYPES} />
      {availableTypes.map((packageType) => (
        <List.Dropdown.Item
          key={packageType}
          title={getPackageTypeTitle(packageType)}
          value={packageType}
          icon={getPackageIcon(packageType)}
        />
      ))}
    </List.Dropdown>
  );
}
