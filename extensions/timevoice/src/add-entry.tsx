import { Action, ActionPanel, Form, Icon, PopToRootType, showHUD } from "@raycast/api";
import { FormValidation, showFailureToast, useForm, withAccessToken } from "@raycast/utils";
import { createEntry, formatDuration, timevoice } from "./api";
import { ProjectAndTagFields, useProjectsAndTags } from "./entry-form-fields";

type Values = {
  description: string;
  project_id: string;
  tag_ids: string[];
  billable: boolean;
  started_at: Date | null;
  ended_at: Date | null;
};

function AddEntry() {
  const { projects, tags, isLoading } = useProjectsAndTags();
  const now = new Date();
  now.setSeconds(0, 0);

  const { handleSubmit, itemProps, setValue } = useForm<Values>({
    initialValues: { started_at: new Date(now.getTime() - 60 * 60 * 1000), ended_at: now, billable: false },
    validation: {
      description: FormValidation.Required,
      started_at: FormValidation.Required,
      ended_at: FormValidation.Required,
    },
    async onSubmit(values) {
      const start = values.started_at as Date;
      const end = values.ended_at as Date;
      if (end <= start) {
        await showFailureToast("The end must be after the start", { title: "Could not add the entry" });
        return;
      }
      try {
        const entry = await createEntry({
          description: values.description,
          project_id: values.project_id || undefined,
          tag_ids: values.tag_ids,
          billable: values.billable,
          started_at: start.toISOString(),
          ended_at: end.toISOString(),
        });
        await showHUD(`Added ${entry.description} · ${formatDuration(entry.duration_seconds ?? 0)}`, {
          popToRootType: PopToRootType.Immediate,
        });
      } catch (error) {
        await showFailureToast(error, { title: "Could not add the entry" });
      }
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Entry" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Description" placeholder="What did you work on?" autoFocus {...itemProps.description} />
      <ProjectAndTagFields
        projects={projects}
        tags={tags}
        onProjectChange={(project) => setValue("billable", project?.billable_default ?? false)}
      />
      <Form.DatePicker title="Start" type={Form.DatePicker.Type.DateTime} {...itemProps.started_at} />
      <Form.DatePicker title="End" type={Form.DatePicker.Type.DateTime} {...itemProps.ended_at} />
      <Form.Checkbox label="Billable" {...itemProps.billable} />
    </Form>
  );
}

export default withAccessToken(timevoice)(AddEntry);
