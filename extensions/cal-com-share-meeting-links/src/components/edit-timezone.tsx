import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, MutatePromise, showFailureToast, useForm } from "@raycast/utils";
import { CalSchedule, updateSchedule } from "@api/cal.com";
import { formatTimeZone } from "@/lib/schedule";

interface EditTimezoneProps {
  schedule: CalSchedule;
  mutate: MutatePromise<CalSchedule[] | undefined>;
}

interface Values {
  timeZone: string;
}

export function EditTimezone({ schedule, mutate }: EditTimezoneProps) {
  const { pop } = useNavigation();

  const zones: string[] = (() => {
    type IntlWithZones = typeof Intl & { supportedValuesOf?: (k: "timeZone") => string[] };
    const intl = Intl as IntlWithZones;
    if (typeof intl.supportedValuesOf === "function") {
      return intl.supportedValuesOf("timeZone");
    }
    return [schedule.timeZone];
  })();

  const apply = async (timeZone: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating timezone" });
    try {
      await mutate(updateSchedule(schedule.id, { timeZone }), {
        optimisticUpdate: (schedules) => schedules?.map((s) => (s.id === schedule.id ? { ...s, timeZone } : s)),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Timezone updated";
    } catch (error) {
      await showFailureToast(error, { title: "Failed to update timezone" });
      throw error;
    } finally {
      pop();
    }
  };

  const { itemProps, handleSubmit } = useForm<Values>({
    onSubmit: (v) => apply(v.timeZone),
    validation: { timeZone: FormValidation.Required },
    initialValues: { timeZone: schedule.timeZone },
  });

  return (
    <Form
      navigationTitle="Edit Timezone"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Timezone" {...itemProps.timeZone}>
        {zones.map((z) => (
          <Form.Dropdown.Item key={z} value={z} title={formatTimeZone(z)} keywords={z.split(/[/_]/)} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
