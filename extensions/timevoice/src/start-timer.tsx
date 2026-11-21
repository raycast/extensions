import { Action, ActionPanel, Form, Icon, PopToRootType, showHUD } from "@raycast/api";
import { showFailureToast, withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { refreshMenuBar, startTimer, timevoice } from "./api";
import { ProjectAndTagFields, useProjectsAndTags } from "./entry-form-fields";

type Values = { description: string; project_id: string; tag_ids: string[]; billable: boolean };

function StartTimer() {
  const { projects, tags, isLoading } = useProjectsAndTags();
  const [billable, setBillable] = useState(false);

  async function handleSubmit(values: Values) {
    try {
      await startTimer({
        description: values.description,
        project_id: values.project_id || undefined,
        tag_ids: values.tag_ids,
        billable: values.billable,
      });
      await refreshMenuBar();
      await showHUD(`Started ${values.description || "timer"}`, { popToRootType: PopToRootType.Immediate });
    } catch (error) {
      await showFailureToast(error, { title: "Could not start the timer" });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Timer" icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="description" title="Description" placeholder="What are you working on?" autoFocus />
      <ProjectAndTagFields
        projects={projects}
        tags={tags}
        onProjectChange={(project) => setBillable(project?.billable_default ?? false)}
      />
      <Form.Checkbox id="billable" label="Billable" value={billable} onChange={setBillable} />
    </Form>
  );
}

export default withAccessToken(timevoice)(StartTimer);
