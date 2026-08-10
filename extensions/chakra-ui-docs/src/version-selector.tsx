import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

export default function VersionSelector() {
  const [version, setVersion] = useCachedState("version", "v3");

  return (
    <List.Dropdown tooltip="Version" onChange={setVersion} defaultValue={version}>
      <List.Dropdown.Item icon="chakra.png" title="v3" value="v3" />
      <List.Dropdown.Item icon="chakra.png" title="v2" value="v2" />
    </List.Dropdown>
  );
}
