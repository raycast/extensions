import React, { useState } from "react";
import { Action, ActionPanel, Form, PopToRootType, Toast, closeMainWindow, showToast } from "@raycast/api";
import { IconChecker, NameChecker, ProjectChecker } from "../../tools/formErrors";
import { ICON_LIST } from "../../data/icons";
import { QueryAddSubpages } from "../../queriesFunctions/SubpagesQueries";
import UseOAuth from "../../fetch/useOAuth";
import { Project } from "../../interfaces/itemsInterfaces";

interface SubmitForm {
  name: string;
  icon: string;
  projectID: string;
}

interface Props {
  projectID: string;
  projects: Project[];
  refresh(targets: string[]): void;
}

const SubpagesForm = (p: Props) => {
  const { projects } = p;

  const { notion } = UseOAuth();

  const [projectValue, setProjectVallue] = useState<string>(p.projectID);

  const [nameError, setNameError] = useState<string | undefined>();
  const [projectError, setProjectError] = useState<string | undefined>();

  const handleErrors = (v: SubmitForm) => {
    let check = true;
    setNameError(NameChecker(v.name));
    setProjectError(ProjectChecker(v.projectID));
    if (
      NameChecker(v.name) === undefined &&
      IconChecker(v.icon) === undefined &&
      ProjectChecker(v.projectID) === undefined
    )
      check = false;
    return check;
  };

  const handleSubmit = async (v: SubmitForm, close: boolean) => {
    showToast({ title: "Add Subpage", style: Toast.Style.Animated });
    const r = await QueryAddSubpages(v.name, v.icon, v.projectID, notion);
    if (r) {
      showToast({ title: "Subpage added successfully", style: Toast.Style.Success }), p.refresh(["project"]);
    } else showToast({ title: "Error adding subpage", style: Toast.Style.Failure });
    if (close) await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={(values: SubmitForm) => {
              if (handleErrors(values)) return;
              handleSubmit(values, true);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" error={nameError} onChange={() => setNameError(undefined)} />

      <Form.Dropdown id="icon" title="Icon">
        {ICON_LIST.map((icon, i) => {
          return <Form.Dropdown.Item key={i} icon={icon.emoji} title={icon.keywords[0]} value={icon.emoji} />;
        })}
      </Form.Dropdown>

      <Form.Dropdown
        id="projectID"
        title="Projects"
        error={projectError}
        value={projectValue}
        onChange={setProjectVallue}
      >
        {projects.map((project, i) => {
          return <Form.Dropdown.Item key={"l" + i} value={project.id} title={project.icon + " " + project.name} />;
        })}
      </Form.Dropdown>
    </Form>
  );
};

export default SubpagesForm;
