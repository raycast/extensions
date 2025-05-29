import { BareRepository } from "#/config/types";
import { Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { basename } from "node:path";

export function useDirectory() {
  const [directory, setDirectory] = useCachedState<string>("directory", "all");
  return { directory, setDirectory };
}

export function DirectoriesDropdown({ projects }: { projects: BareRepository[] }) {
  const { directory, setDirectory } = useDirectory();

  return (
    <List.Dropdown tooltip="Select Project Directory" onChange={setDirectory} value={directory}>
      <List.Dropdown.Section>
        <List.Dropdown.Item key="all" title="All" value="all" icon={Icon.HardDrive} />
      </List.Dropdown.Section>
      <List.Dropdown.Section>
        {projects.map((dir) => {
          return (
            <List.Dropdown.Item
              key={dir.fullPath}
              title={basename(dir.fullPath)}
              value={dir.fullPath}
              icon={Icon.Folder}
            />
          );
        })}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
