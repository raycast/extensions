import { Project } from "@makeplane/plane-node-sdk";
import { List } from "@raycast/api";
import { getProjectIcon } from "../helpers/icons";

type ProjectDropdownProps = {
  projects: Project[];
  onChange: (projectId: string) => void;
  /** Persist the selection per command. */
  storeValue?: boolean;
  /** Optional first item (e.g. "Workspace Pages") with value "". */
  allItemTitle?: string;
};

export default function ProjectDropdown({ projects, onChange, storeValue = true, allItemTitle }: ProjectDropdownProps) {
  return (
    <List.Dropdown tooltip="Select Project" storeValue={storeValue} onChange={onChange}>
      {allItemTitle ? <List.Dropdown.Item title={allItemTitle} value="" /> : null}
      <List.Dropdown.Section>
        {projects.map((project) =>
          project.id ? (
            <List.Dropdown.Item
              key={project.id}
              icon={getProjectIcon(project.logoProps)}
              title={`${project.name} (${project.identifier})`}
              value={project.id}
            />
          ) : null,
        )}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
