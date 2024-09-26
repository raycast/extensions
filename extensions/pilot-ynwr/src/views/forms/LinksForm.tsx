import React, { useState } from "react";
import { Action, ActionPanel, Form, PopToRootType, Toast, closeMainWindow, showToast } from "@raycast/api";
import { NameChecker, ProjectChecker, UrlChecker } from "../../tools/formErrors";

import { QueryAddLink } from "../../queriesFunctions/LinksQueries";
import UseOAuth from "../../fetch/useOAuth";
import { Project } from "../../interfaces/itemsInterfaces";
import { ICON_LIST } from "../../data/icons";

interface SubmitForm {
  name: string;
  link: string;
  projectID: string;
  app: string;
  icon: string;
}

interface Props {
  projectID: string;
  projects: Project[];
  refresh(targets: string[]): void;
}

const LinksForm = (p: Props) => {
  const { projects } = p;

  const { notion } = UseOAuth();

  const [projectValue, setProjectValue] = useState<string>(p.projectID);

  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [projectError, setProjectError] = useState<string | undefined>(undefined);
  const [linkError, setLinkError] = useState<string | undefined>(undefined);

  const handleErrors = (v: SubmitForm) => {
    let check = true;
    setNameError(NameChecker(v.name));
    setProjectError(ProjectChecker(v.projectID));
    setLinkError(UrlChecker(v.link));
    if (nameError === undefined && projectError === undefined && linkError === undefined) check = false;
    return check;
  };

  const handleSubmit = async (v: SubmitForm, close: boolean) => {
    const r = await QueryAddLink(v.name, v.projectID, v.link, v.app, v.icon, notion);
    if (r) {
      showToast({ title: "Link added successfully", style: Toast.Style.Success }), p.refresh(["project"]);
    } else showToast({ title: "Error adding link", style: Toast.Style.Failure });
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
      <Form.TextField id="name" title="Name" placeholder="Link" error={nameError} />
      <Form.Dropdown id="icon" title="Icon">
        {ICON_LIST.map((icon, i) => {
          return <Form.Dropdown.Item key={i} icon={icon.emoji} title={icon.keywords[0]} value={icon.emoji} />;
        })}
      </Form.Dropdown>

      <Form.Dropdown
        id="projectID"
        title="Project"
        error={projectError}
        value={projectValue}
        onChange={setProjectValue}
      >
        {projects.map((item, i) => {
          return <Form.Dropdown.Item key={i} value={item.id} title={item.icon + " " + item.name} />;
        })}
      </Form.Dropdown>

      <Form.TextField id="link" title="Link URL" placeholder="URL" error={linkError} />

      <Form.TextField id="app" title="Application Named" placeholder="App Name" />
    </Form>
  );
};

export default LinksForm;
