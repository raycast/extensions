import { List } from "@raycast/api";
import { TeamProject } from "azure-devops-node-api/interfaces/CoreInterfaces";

export default function ProjectDropdown(props: {
  projects?: TeamProject[];
  onProjectChange: (newValue: string) => void;
}) {
  const { projects, onProjectChange } = props;
  return (
    <List.Dropdown tooltip="Select project" storeValue={true} onChange={(value) => onProjectChange(value)}>
      <List.Dropdown.Section title="Projects">
        {projects?.map((project) => (
          <List.Dropdown.Item key={project.id} title={project.name!} value={project.name!} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
