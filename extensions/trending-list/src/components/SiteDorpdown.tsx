import { List } from "@raycast/api";

import { SiteItem } from "../type";

interface SiteDropdownProps {
  siteList: SiteItem[];
  onSiteChange: (newValue: string) => void;
}

export default function SiteDropdown(props: SiteDropdownProps) {
  const { siteList, onSiteChange } = props;

  return (
    <List.Dropdown tooltip="Select Site" storeValue={true} onChange={onSiteChange}>
      {siteList.map((siteItem) => (
        <List.Dropdown.Item key={siteItem.key} title={siteItem.name} value={siteItem.key} />
      ))}
    </List.Dropdown>
  );
}
