import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, MutatePromise, showFailureToast, useForm } from "@raycast/utils";
import { CalSchedule, updateSchedule } from "@api/cal.com";

interface RenameScheduleProps {
  schedule: CalSchedule;
  mutate: MutatePromise<CalSchedule[] | undefined>;
}

interface Values {
  name: string;
}

export function RenameSchedule({ schedule, mutate }: RenameScheduleProps) {
  const { pop } = useNavigation();

  const apply = async (name: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Renaming schedule" });
    try {
      await mutate(updateSchedule(schedule.id, { name }), {
        optimisticUpdate: (schedules) => schedules?.map((s) => (s.id === schedule.id ? { ...s, name } : s)),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Schedule renamed";
    } catch (error) {
      await showFailureToast(error, { title: "Failed to rename schedule" });
      return; // leave form open so user can retry
    }
    pop();
  };

  const { itemProps, handleSubmit } = useForm<Values>({
    onSubmit: (v) => apply(v.name.trim()),
    validation: { name: FormValidation.Required },
    initialValues: { name: schedule.name },
  });

  return (
    <Form
      navigationTitle="Rename Schedule"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" {...itemProps.name} />
    </Form>
  );
}
