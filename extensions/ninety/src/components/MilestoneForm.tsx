import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { createMilestone, updateMilestone } from "../api/ninety";
import { Milestone, Rock } from "../api/types";
import { showError } from "../lib/errors";
import { htmlToText, parseDueDate, toNinetyDate } from "../lib/format";

interface Values {
  title: string;
  description: string;
  dueDate: Date | null;
}

interface Props {
  rock: Rock;
  milestone?: Milestone;
  onSaved?: () => void;
}

export function MilestoneForm({ rock, milestone, onSaved }: Props) {
  const { pop } = useNavigation();
  const isEdit = !!milestone;

  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: {
      title: milestone?.title ?? "",
      description: htmlToText(milestone?.description),
      dueDate: parseDueDate(milestone?.dueDate ?? rock.dueDate) ?? null,
    },
    validation: { title: FormValidation.Required, dueDate: FormValidation.Required },
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: isEdit ? "Saving Milestone…" : "Adding Milestone…",
      });
      try {
        const payload = {
          title: values.title.trim(),
          description: milestone ? values.description.trim() : values.description.trim() || undefined,
          dueDate: toNinetyDate(values.dueDate ?? new Date()),
        };
        if (milestone) {
          await updateMilestone(milestone._id, payload);
        } else {
          await createMilestone({ ...payload, rockId: rock._id, teamId: rock.teamId });
        }
        toast.style = Toast.Style.Success;
        toast.title = isEdit ? "Milestone saved" : "Milestone added";
        onSaved?.();
        pop();
      } catch (error) {
        toast.hide();
        await showError(error, isEdit ? "Couldn't save Milestone" : "Couldn't add Milestone");
      }
    },
  });

  return (
    <Form
      navigationTitle={isEdit ? "Edit Milestone" : "Add Milestone"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEdit ? "Save Milestone" : "Add Milestone"}
            icon={Icon.Checkmark}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Rock" text={rock.title} />
      <Form.TextField title="Title" placeholder="Milestone" {...itemProps.title} />
      <Form.DatePicker title="Due Date" type={Form.DatePicker.Type.Date} {...itemProps.dueDate} />
      <Form.TextArea title="Description" placeholder="Optional" {...itemProps.description} />
    </Form>
  );
}
