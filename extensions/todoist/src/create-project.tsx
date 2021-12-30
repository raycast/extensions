import { useState } from "react";
import { ActionPanel, Form, Icon, render, showToast, ToastStyle } from "@raycast/api";
import { Project as TProject, ProjectPayload } from "./types";
import { createProject, useFetch } from "./api";
import { defaultColor, projectColors } from "./constants";

function CreateProject() {
  const { data, isLoading } = useFetch<TProject[]>("/projects");

  const projects = data?.filter((project) => !project.inbox_project);

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>();
  const [favorite, setFavorite] = useState<boolean>(false);
  const [colorId, setColorId] = useState<string>(String(defaultColor));

  function clear() {
    setName("");
    setParentId("");
    setColorId(String(defaultColor));
    setFavorite(false);
  }

  async function submit() {
    const body: ProjectPayload = { name, favorite };

    if (!body.name) {
      await showToast(ToastStyle.Failure, "The project's name is required");
      return;
    }

    if (parentId) {
      body.parent_id = parseInt(parentId);
    }

    if (colorId) {
      body.color = parseInt(colorId);
    }

    await createProject(body);
    clear();
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Item title="Create Project" onAction={submit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="My project" value={name} onChange={setName} />

      <Form.Dropdown id="color" title="Color" value={colorId} onChange={setColorId}>
        {projectColors.map(({ name, id }) => (
          <Form.Dropdown.Item value={String(id)} title={name} key={id} />
        ))}
      </Form.Dropdown>

      {projects && projects.length > 0 ? (
        <Form.Dropdown id="parent_id" title="Parent project" value={parentId} onChange={setParentId}>
          <Form.Dropdown.Item value="" title="None" />
          {projects.map(({ id, name }) => (
            <Form.Dropdown.Item value={String(id)} title={name} key={id} />
          ))}
        </Form.Dropdown>
      ) : null}

      <Form.Checkbox id="favorite" label="Mark as favorite?" value={favorite} onChange={setFavorite} />
    </Form>
  );
}

render(<CreateProject />);
