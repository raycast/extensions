import { Action, ActionPanel, Form, Icon, LaunchProps, popToRoot, showToast, Toast } from "@raycast/api";
import { FormValidation, showFailureToast, useForm, usePromise } from "@raycast/utils";
import { addTask, AddTaskResult } from "./lib/api/add-task";
import { getProjects } from "./lib/api/list-projects";
import { listTags } from "./lib/api/list-tags";
import { ValidateRequirements } from "./lib/components/with-requirements";
import { CreateOmniFocusTaskOptions } from "./lib/types/task";

interface FormValues extends CreateOmniFocusTaskOptions {
  tagsToCreate?: string;
}

export default function Command(props: LaunchProps<{ draftValues: FormValues }>) {
  // The form loads tags and projects from OmniFocus, so only render it once the requirements check
  // (installed + Pro) has passed. Otherwise users without Pro get a load error instead of the explanation.
  return (
    <ValidateRequirements>
      <AddTaskForm draftValues={props.draftValues} />
    </ValidateRequirements>
  );
}

function parseTagsToCreate(input?: string) {
  return (input ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getWarnings(result: AddTaskResult) {
  const warnings: { title: string; message: string }[] = [];
  if (result.tagAssignmentFailed) {
    warnings.push({ title: "Task added without some tags", message: "Assign the missing tags in OmniFocus." });
  }
  if (result.projectAssignmentFailed) {
    warnings.push({
      title: "Task added to the inbox",
      message: "The project couldn't be assigned. Move the task in OmniFocus.",
    });
  }
  if (result.plannedDateUnsupported) {
    warnings.push({
      title: "Task added without a Planned Date",
      message:
        "Planned dates need OmniFocus 4.7 or later with a migrated database. Migrate it in OmniFocus Settings > Database, then set the date in OmniFocus.",
    });
  }
  return warnings;
}

function AddTaskForm({ draftValues }: { draftValues?: FormValues }) {
  const { isLoading: tagsLoading, data: tags } = usePromise(listTags, [], {
    onError: async (error) => {
      await showFailureToast(error, { title: "Couldn't load your OmniFocus tags" });
    },
  });
  const { isLoading: projectsLoading, data: projects } = usePromise(getProjects, [], {
    onError: async (error) => {
      await showFailureToast(error, { title: "Couldn't load your OmniFocus projects" });
    },
  });

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: draftValues,
    async onSubmit(values) {
      const { tagsToCreate, ...options } = values;
      // Build a new array: values.tags is the form's own state, so adding to it in place
      // would repeat the typed tags on every retry.
      const tags = [...new Set([...(options.tags ?? []), ...parseTagsToCreate(tagsToCreate)])];

      let result: AddTaskResult;
      try {
        result = await addTask({ ...options, tags });
      } catch (error) {
        await showFailureToast(error, { title: "Couldn't add the task" });
        return;
      }

      // The task exists from here on, so close the form even if a follow-up step failed:
      // submitting again would create a second task.
      const warnings = getWarnings(result);
      if (warnings.length === 1) {
        await showToast({ style: Toast.Style.Failure, ...warnings[0] });
      } else if (warnings.length > 1) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Task added with some details missing",
          message: warnings.map((warning) => warning.message).join(" "),
        });
      } else {
        await showToast({ style: Toast.Style.Success, title: "Task added!" });
      }
      await popToRoot();
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={tagsLoading || projectsLoading}
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Walk the cat" {...itemProps.name} autoFocus />
      <Form.Checkbox title="Flagged" label="Flagged" {...itemProps.flagged} />
      <Form.Separator />
      <Form.DatePicker title="Defer Date" {...itemProps.deferDate} id="deferDate" type={Form.DatePicker.Type.Date} />
      <Form.DatePicker
        title="Planned Date"
        {...itemProps.plannedDate}
        id="plannedDate"
        type={Form.DatePicker.Type.Date}
      />
      <Form.DatePicker title="Due Date" {...itemProps.dueDate} id="dueDate" type={Form.DatePicker.Type.Date} />
      <Form.Separator />
      <Form.TagPicker title="Tags" {...itemProps.tags}>
        {tags?.map((tag) => <Form.TagPicker.Item key={tag} value={tag} title={tag} icon={{ source: Icon.Tag }} />)}
      </Form.TagPicker>
      <Form.Description text="If you want to assign tags that don't exist yet, you can add them here. They will be created in OmniFocus." />
      <Form.TextField title="Tags to create" placeholder="tag1,tag2,tag3" {...itemProps.tagsToCreate} />
      <Form.Dropdown title="Projects" {...itemProps.projectId}>
        <Form.Dropdown.Item value="" title="No Project (Inbox)" />
        {projects?.map((p) => <Form.Dropdown.Item key={p.id} value={p.id} title={p.name} />)}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextArea title="Note" {...itemProps.note} />
    </Form>
  );
}
