import { List } from "@raycast/api";

const ProjectsDropdown = (props: { projects: Set<string>; onProjectChange: (newValue: string) => void }) => {
  const { projects: projects, onProjectChange: onProjectChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Project"
      storeValue={true}
      defaultValue={"All"}
      onChange={(newValue) => {
        onProjectChange(newValue);
      }}
    >
      {Array.from(projects).map((project) => (
        <List.Dropdown.Item key={project} title={project} value={project} />
      ))}
      <List.Dropdown.Section title="Projects"></List.Dropdown.Section>
    </List.Dropdown>
  );
};

export default ProjectsDropdown;
