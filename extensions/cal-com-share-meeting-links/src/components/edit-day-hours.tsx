import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { MutatePromise, showFailureToast, useForm } from "@raycast/utils";
import { CalSchedule, CalWeekday, updateSchedule } from "@api/cal.com";
import { DayRange, rangesForDay, TIME_SLOTS, withDayHoursReplaced } from "@/lib/schedule";

const MAX_RANGES = 3;
const NONE = "";

interface EditDayHoursProps {
  schedule: CalSchedule;
  day: CalWeekday;
  mutate: MutatePromise<CalSchedule[] | undefined>;
}

interface Values {
  start1: string;
  end1: string;
  start2: string;
  end2: string;
  start3: string;
  end3: string;
}

function initialValues(schedule: CalSchedule, day: CalWeekday): Values {
  const existing = rangesForDay(schedule, day);
  const pick = (i: number, k: keyof DayRange) => existing[i]?.[k] ?? NONE;
  return {
    start1: pick(0, "startTime"),
    end1: pick(0, "endTime"),
    start2: pick(1, "startTime"),
    end2: pick(1, "endTime"),
    start3: pick(2, "startTime"),
    end3: pick(2, "endTime"),
  };
}

function collectRanges(v: Values): { ranges: DayRange[]; error?: string } {
  const pairs: [string, string][] = [
    [v.start1, v.end1],
    [v.start2, v.end2],
    [v.start3, v.end3],
  ];
  const ranges: DayRange[] = [];
  for (const [s, e] of pairs) {
    const hasStart = s !== NONE;
    const hasEnd = e !== NONE;
    if (!hasStart && !hasEnd) continue;
    if (!hasStart || !hasEnd) return { ranges: [], error: "Each range needs both a start and an end" };
    if (e <= s) return { ranges: [], error: "End must be after start" };
    ranges.push({ startTime: s, endTime: e });
  }
  // Overlap check
  const sorted = [...ranges].sort((a, b) => a.startTime.localeCompare(b.startTime));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startTime < sorted[i - 1].endTime) {
      return { ranges: [], error: "Ranges may not overlap" };
    }
  }
  return { ranges };
}

export function EditDayHours({ schedule, day, mutate }: EditDayHoursProps) {
  const { pop } = useNavigation();

  const apply = async (values: Values) => {
    const { ranges, error } = collectRanges(values);
    if (error) {
      await showToast({ style: Toast.Style.Failure, title: error });
      return;
    }
    const availability = withDayHoursReplaced(schedule, day, ranges);
    const toast = await showToast({ style: Toast.Style.Animated, title: `Updating ${day}` });
    try {
      await mutate(updateSchedule(schedule.id, { availability }), {
        optimisticUpdate: (schedules) => schedules?.map((s) => (s.id === schedule.id ? { ...s, availability } : s)),
      });
      toast.style = Toast.Style.Success;
      toast.title = `${day} updated`;
    } catch (err) {
      await showFailureToast(err, { title: `Failed to update ${day}` });
      return; // leave form open so user can retry
    }
    pop();
  };

  const { itemProps, handleSubmit } = useForm<Values>({
    onSubmit: apply,
    initialValues: initialValues(schedule, day),
  });

  const slotDropdown = (title: string, props: Form.ItemProps<string>, key: string) => (
    <Form.Dropdown title={title} {...props}>
      <Form.Dropdown.Item key={`${key}-none`} value={NONE} title="—" />
      {TIME_SLOTS.map((t) => (
        <Form.Dropdown.Item key={`${key}-${t}`} value={t} title={t} />
      ))}
    </Form.Dropdown>
  );

  return (
    <Form
      navigationTitle={`Edit ${day}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Ranges"
        text={`Up to ${MAX_RANGES} ranges per day. Leave both fields as "—" to skip a range. For more complex schedules, use the web UI.`}
      />
      {slotDropdown("Range 1 start", itemProps.start1, "s1")}
      {slotDropdown("Range 1 end", itemProps.end1, "e1")}
      {slotDropdown("Range 2 start", itemProps.start2, "s2")}
      {slotDropdown("Range 2 end", itemProps.end2, "e2")}
      {slotDropdown("Range 3 start", itemProps.start3, "s3")}
      {slotDropdown("Range 3 end", itemProps.end3, "e3")}
    </Form>
  );
}
