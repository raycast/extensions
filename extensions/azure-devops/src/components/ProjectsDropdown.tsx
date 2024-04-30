import { List } from "@raycast/api";
import { Project } from "../utils/types";

export default function ProjectDropdown(props: { projects?: Project[]; onProjectChange: (newValue: string) => void }) {
  const { projects, onProjectChange } = props;
  return (
    <List.Dropdown tooltip="Select project" storeValue={true} onChange={(value) => onProjectChange(value)}>
      <List.Dropdown.Section title="Projects">
        {projects?.map((project) => <List.Dropdown.Item key={project.id} title={project.name} value={project.name} />)}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
