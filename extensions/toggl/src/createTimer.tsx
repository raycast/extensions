import { ActionPanel, closeMainWindow, Form, Icon, showHUD, SubmitFormAction, Toast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { getProjects, getWorkspaces, startTimer } from "./toggl";
import { NewTimeEntry, Project } from "./types";

async function submitForm(values: NewTimeEntry) {
  if (values.description == "") {
    const toast = new Toast({ style: ToastStyle.Failure, title: "No description was given!" });
    await toast.show();
  } else if (values.pid == -1) {
    const toast = new Toast({ style: ToastStyle.Failure, title: "No project was selected!" });
    await toast.show();
  } else {
    const timerObj = {
      description: values.description,
      pid: values.pid,
    };
    await closeMainWindow();
    await startTimer(timerObj);
    await showHUD(`Timer for "${timerObj.description}" created! 🎉`);
  }
}

export default function CreateTimer() {
  const [projects, setProjects] = useState<Array<Project>>();

  useEffect(() => {
    const getProj = async () => {
      const workspaces = await getWorkspaces();
      const projectsList: Array<Project> = await getProjects(workspaces[0].id.toString());
      const blankProj: Project = {
        id: -1,
        wid: workspaces[0].id,
        name: "No Project",
        billable: false,
        is_private: false,
        active: false,
        template: false,
        at: "",
        created_at: "",
        color: "",
        auto_estimates: false,
        actual_hours: -1,
        hex_color: "",
      };
      projectsList.unshift(blankProj);
      setProjects(projectsList);
    };
    getProj();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Create New Timer" onSubmit={async (values: NewTimeEntry) => submitForm(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="description" title="Timer Name" placeholder="Llama Taming" />
      <Form.Dropdown id="pid" title="Timer Project">
        {projects?.map((project) => (
          <Form.DropdownItem
            value={project.id.toString()}
            title={project.name}
            icon={{ source: Icon.Circle, tintColor: project.hex_color }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
