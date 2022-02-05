import { useState } from "react";
import { ActionPanel, Form, Icon, render, showToast, ToastStyle } from "@raycast/api";
import { AddProjectArgs } from "@doist/todoist-api-typescript";
import { createProject, getProjects, handleError } from "./api";
import { defaultColor, projectColors } from "./constants";

function CreateProject() {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>();
  const [favorite, setFavorite] = useState<boolean>(false);
  const [colorId, setColorId] = useState<string>(String(defaultColor));

  const { data, error } = getProjects();

  if (error) {
    handleError({ error, title: "Failed to get projects" });
  }

  const projects = data?.filter((project) => !project.inboxProject);

  function clear() {
    setName("");
    setParentId("");
    setColorId(String(defaultColor));
    setFavorite(false);
  }

  async function submit() {
    const body: AddProjectArgs = { name, favorite };

    if (!body.name) {
      await showToast(ToastStyle.Failure, "The project's name is required");
      return;
    }

    if (parentId) {
      body.parentId = parseInt(parentId);
    }

    if (colorId) {
      body.color = parseInt(colorId);
    }

    await createProject(body);
    clear();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Item title="Create Project" onAction={submit} icon={Icon.Plus} />
        </ActionPanel>
      }
      isLoading={!data && !error}
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
