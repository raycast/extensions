import { Action, ActionPanel, Form, Icon, PopToRootType, Toast, closeMainWindow, showToast } from "@raycast/api";
import React from "react";
import { Project, Timer } from "../../interfaces/interfaceItems";

import { QueryStopTimer } from "../../queriesFunctions/TimersQueries";
import UseOAuth from "../../fetch/useOAuth";

interface SubmitForm {
  projectID: string;
  end: string;
}

const EndTimerForm = ({ props }: { props: { timer: Timer; projects: Project[] } }) => {
  const { projects, timer } = props;

  const { notion } = UseOAuth();

  const handleSubmit = async (v: SubmitForm) => {
    const now = new Date();
    showToast({ title: "Adding Timer", style: Toast.Style.Animated });
    const project = projects.find((project) => project.id === v.projectID);
    await QueryStopTimer(timer.id, timer?.start, now.toISOString(), project as Project, notion);
    showToast({ title: "Timer stopped successfully", style: Toast.Style.Success });
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="End Your Timer"
            icon={Icon.Alarm}
            onSubmit={(values: SubmitForm) => {
              handleSubmit(values);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="projectID" title="Project">
        {projects.map((project, i) => {
          return <Form.Dropdown.Item key={i} value={project.id} title={project.icon + " " + project.name} />;
        })}
      </Form.Dropdown>
    </Form>
  );
};

export default EndTimerForm;
