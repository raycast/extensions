import { List } from "@raycast/api";

type VersionSelectProps = {
  versions?: string[];
  setVersion: (version?: string) => void;
};
export const VersionSelect = ({ versions, setVersion }: VersionSelectProps) => (
  <List.Dropdown tooltip="Select Version" storeValue={true} onChange={setVersion}>
    {versions?.map((version) => (
      <List.Dropdown.Item key={version} value={version} title={version} />
    ))}
  </List.Dropdown>
);
