import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { MutatePromise, showFailureToast, useForm } from "@raycast/utils";
import { CalSchedule, CalScheduleOverride, updateSchedule } from "@api/cal.com";
import { fromIsoDate, TIME_SLOTS, toIsoDate, withOverrideUpserted } from "@/lib/schedule";

interface EditOverrideProps {
  schedule: CalSchedule;
  mutate: MutatePromise<CalSchedule[] | undefined>;
  /** When editing an existing override, pass its original date. Undefined means "add new". */
  existingDate?: string;
}

interface Values {
  date: Date | null;
  unavailable: boolean;
  startTime: string;
  endTime: string;
}

export function EditOverride({ schedule, mutate, existingDate }: EditOverrideProps) {
  const { pop } = useNavigation();
  const existing = existingDate ? schedule.overrides.find((o) => o.date === existingDate) : undefined;
  const isUnavailable = existing ? existing.startTime === existing.endTime : false;

  const initialValues: Values = {
    date: existing ? fromIsoDate(existing.date) : null,
    unavailable: isUnavailable,
    startTime: existing && !isUnavailable ? existing.startTime : "09:00",
    endTime: existing && !isUnavailable ? existing.endTime : "17:00",
  };

  const apply = async (values: Values) => {
    if (!values.date) return;
    if (!values.unavailable && values.endTime <= values.startTime) {
      await showToast({ style: Toast.Style.Failure, title: "End must be after start" });
      return;
    }
    const iso = toIsoDate(values.date);
    const override: CalScheduleOverride = values.unavailable
      ? { date: iso, startTime: "00:00", endTime: "00:00" }
      : { date: iso, startTime: values.startTime, endTime: values.endTime };

    let overrides = withOverrideUpserted(schedule, override);
    if (existingDate && existingDate !== iso) {
      // Date changed during edit — drop the old entry.
      overrides = overrides.filter((o) => o.date !== existingDate);
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: existingDate ? "Updating override" : "Adding override",
    });
    try {
      await mutate(updateSchedule(schedule.id, { overrides }), {
        optimisticUpdate: (schedules) => schedules?.map((s) => (s.id === schedule.id ? { ...s, overrides } : s)),
      });
      toast.style = Toast.Style.Success;
      toast.title = existingDate ? "Override updated" : "Override added";
    } catch (error) {
      await showFailureToast(error, {
        title: existingDate ? "Failed to update override" : "Failed to add override",
      });
      return; // leave form open so user can retry
    }
    pop();
  };

  const { itemProps, handleSubmit, values } = useForm<Values>({
    onSubmit: apply,
    validation: {
      date: (v) => (v ? undefined : "Date is required"),
    },
    initialValues,
  });

  return (
    <Form
      navigationTitle={existingDate ? "Edit Override" : "Add Override"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker title="Date" type={Form.DatePicker.Type.Date} {...itemProps.date} />
      <Form.Checkbox label="Unavailable all day" {...itemProps.unavailable} />
      {!values.unavailable && (
        <>
          <Form.Dropdown title="Start" {...itemProps.startTime}>
            {TIME_SLOTS.map((t) => (
              <Form.Dropdown.Item key={t} value={t} title={t} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown title="End" {...itemProps.endTime}>
            {TIME_SLOTS.map((t) => (
              <Form.Dropdown.Item key={t} value={t} title={t} />
            ))}
          </Form.Dropdown>
        </>
      )}
    </Form>
  );
}
