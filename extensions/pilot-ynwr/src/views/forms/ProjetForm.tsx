import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import { NameChecker } from "../../tools/formErrors";
import { ICON_LIST } from "../../data/icons";
import { QueryAddProject } from "../../queriesFunctions/ProjectQueries";
import UseOAuth from "../../fetch/useOAuth";

interface ProjectForm {
  name: string;
  icon: string;
  description: string;
}

interface Props {
  refresh(type: string[]): void;
}

const ProjetForm = (p: Props) => {
  const { refresh } = p;
  const { pop } = useNavigation();
  const { notion } = UseOAuth();

  //ERRORS STATES
  const [nameError, setNameError] = useState<string | undefined>(undefined);

  const handleSubmitForm = async (values: ProjectForm) => {
    showToast({ title: "Adding Project", style: Toast.Style.Animated });
    await QueryAddProject(values.name, values.icon, notion);
    refresh(["project"]);
    pop();
  };

  const handleErrors = (values: ProjectForm) => {
    let check = true;
    setNameError(NameChecker(values.name));
    if (NameChecker(values.name) === undefined) check = false;
    return check;
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={(values: ProjectForm) => {
              if (handleErrors(values)) return;
              handleSubmitForm(values);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField error={nameError} id="name" title="Project Name" placeholder="Name" />

      <Form.Dropdown id="icon" title="Project Icon" placeholder="Icon">
        {ICON_LIST.map((icon, i) => {
          return <Form.Dropdown.Item key={i} icon={icon.emoji} title={icon.keywords[0]} value={icon.emoji} />;
        })}
      </Form.Dropdown>
    </Form>
  );
};

export default ProjetForm;
