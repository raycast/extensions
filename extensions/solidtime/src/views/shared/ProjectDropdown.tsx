import { Form } from "@raycast/api";
import { forwardRef } from "react";
import { useProjects } from "../../api/hooks.js";
import { createColorIcon } from "../../utils/color.js";
import { useOrgId } from "../../utils/membership.js";

export const ProjectDropdown = forwardRef<Form.ItemReference, Form.Dropdown.Props>((props, ref) => {
  const orgId = useOrgId();
  const projects = useProjects(orgId);

  return (
    <Form.Dropdown ref={ref} title="Client" isLoading={projects.isLoading} {...props}>
      <Form.Dropdown.Item value={""} title="None" />
      {projects.data?.map((project) => (
        <Form.Dropdown.Item
          key={project.id}
          value={project.id}
          title={project.name}
          icon={createColorIcon(project.color)}
        />
      ))}
    </Form.Dropdown>
  );
});
