import { Action, ActionPanel, Form, Icon, LaunchProps, List, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { addTask } from "./lib/api/add-task";
import { getProjects } from "./lib/api/list-projects";
import { listTags } from "./lib/api/list-tags";
import { Project } from "./lib/types/project";
import { CreateOmniFocusTaskOptions } from "./lib/types/task";
import { useValidateRequirements } from "./lib/utils/useValidateRequirements";

interface FormValues extends CreateOmniFocusTaskOptions {
  tagsToCreate?: string;
}
export default function Command(props: LaunchProps<{ draftValues: FormValues }>) {
  const { draftValues } = props;
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { loading, check, error } = useValidateRequirements();
  const [requirementError, setRequirementError] = useState<string | null>(null);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: draftValues,
    async onSubmit(values) {
      const taskDraft = { ...values };
      if (values.tagsToCreate) {
        const tagsToCreate = values.tagsToCreate.split(",").map((tag) => tag.trim());
        taskDraft.tags.push(...tagsToCreate);
      }
      try {
        await addTask(taskDraft);
        await showToast({
          style: Toast.Style.Success,
          title: "Task added!",
        });
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Something went wrong.",
        });
      }
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  useEffect(() => {
    if (!loading) {
      if (check) {
        setIsLoading(true);
        Promise.all([getProjects(), listTags()])
          .then(([p, t]) => {
            setProjects(p);
            setTags(t);
            setIsLoading(false);
          })
          .catch(() => {
            setIsLoading(false);
            showToast({
              style: Toast.Style.Failure,
              title: "Cannot get projects or tags",
            });
          });
      } else {
        setRequirementError(error);
      }
    }
  }, [loading, check, error]);

  if (requirementError) {
    return (
      <List>
        <List.EmptyView title={requirementError} icon={Icon.Plug} />
      </List>
    );
  }

  return (
    <Form
      isLoading={loading || isLoading}
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
      <Form.DatePicker title="Due Date" {...itemProps.dueDate} id="dueDate" type={Form.DatePicker.Type.Date} />
      <Form.Separator />
      <Form.TagPicker title="Tags" {...itemProps.tags}>
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} icon={{ source: Icon.Tag }} />
        ))}
      </Form.TagPicker>
      <Form.Description text="If you want to assign tags that don't exist yet, you can add them here. They will be created in OmniFocus." />
      <Form.TextField title="Tags to create" placeholder="tag1,tag2,tag3" {...itemProps.tagsToCreate} />
      <Form.Dropdown title="Projects" {...itemProps.projectName} id="projectName">
        <Form.Dropdown.Item value="" title="No Project (Inbox)" />
        {projects.map((p) => (
          <Form.Dropdown.Item key={p.id} value={p.name} title={p.name} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextArea title="Note" {...itemProps.note} />
    </Form>
  );
}
