import { Action, ActionPanel, Clipboard, Form, Icon, Toast, showToast, open, useNavigation } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { appUrl, createBooking, getAvailability, getEventTypes, viewerTz } from "./api";
import { groupByDay, longWhen, minutes, time, tzName } from "./format";
import { failToast, typeIcon } from "./ui";

type Values = {
  type: string;
  when: Date | null;
  name: string;
  email: string;
  note: string;
};

const CUSTOM = [15, 30, 45, 60].map((d) => `len:${d}`);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The next quarter hour, at least 30 minutes away: a sensible default start. */
function nextQuarter(): Date {
  const d = new Date(Date.now() + 30 * 60 * 1000);
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15);
  return d;
}

export function NewMeetingForm(props: { start?: string; typeSlug?: string }) {
  const { pop } = useNavigation();
  const types = useCachedPromise(getEventTypes, [], { onError: () => undefined });
  const list = types.data || [];

  const { handleSubmit, itemProps, reset, setValue, values } = useForm<Values>({
    initialValues: {
      type: props.typeSlug || "",
      when: props.start ? new Date(props.start) : nextQuarter(),
      name: "",
      email: "",
      note: "",
    },
    validation: {
      type: FormValidation.Required,
      when: (v) => {
        if (!v) return "Pick a time";
        if (v.getTime() < Date.now()) return "Pick a time that has not passed";
      },
      name: (v) => (!v || !v.trim() ? "Add their name" : undefined),
      email: (v) => (!v || !EMAIL.test(v.trim()) ? "Add a valid email" : undefined),
    },
    async onSubmit(v) {
      const t = list.find((x) => x.slug === v.type);
      const duration = t ? t.duration_min : Number(v.type.slice(4)) || 30;
      const toast = await showToast({ style: Toast.Style.Animated, title: "Booking" });
      try {
        const made = await createBooking({
          start: (v.when as Date).toISOString(),
          duration,
          name: v.name.trim(),
          email: v.email.trim(),
          note: v.note.trim() || undefined,
          eventType: t ? t.slug : undefined,
          tz: viewerTz(),
        });
        toast.style = Toast.Style.Success;
        toast.title = "Meeting booked";
        toast.message = `${v.name.trim()}, ${longWhen(made.start)}. They have the invite.`;
        if (made.meetUrl) {
          const link = made.meetUrl;
          toast.primaryAction = {
            title: "Copy Join Link",
            shortcut: { modifiers: ["cmd", "shift"], key: "c" },
            onAction: async (tt) => {
              await Clipboard.copy(link);
              tt.title = "Join link copied";
            },
          };
        }
        toast.secondaryAction = { title: "Open in Gaurify Meet", onAction: () => open(appUrl("bookings")) };
        if (made.meetUrl) await Clipboard.copy(made.meetUrl);
        reset({ type: v.type, when: nextQuarter(), name: "", email: "", note: "" });
        if (props.start) pop();
      } catch (e) {
        toast.hide();
        await failToast(e, "Couldn't book that");
      }
    },
  });

  // Real open times for the chosen type, so a time can be picked, not typed.
  const typeKey = values.type || list[0]?.slug || "len:30";
  const slotsQ = useCachedPromise(
    (k: string) =>
      k.startsWith("len:") ? getAvailability({ duration: Number(k.slice(4)) }) : getAvailability({ type: k }),
    [typeKey],
    { execute: !types.isLoading, keepPreviousData: true, onError: () => undefined },
  );
  const openGroups = groupByDay(slotsQ.data?.slots || [], (x) => x);
  const picked = (slotsQ.data?.slots || []).find(
    (x) => new Date(x).getTime() === (values.when as Date | null)?.getTime(),
  );

  return (
    <Form
      isLoading={types.isLoading || slotsQ.isLoading}
      navigationTitle="New Meeting"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Book Meeting" icon={Icon.Calendar} onSubmit={handleSubmit} />
          <Action.OpenInBrowser title="Open Gaurify Meet" url={appUrl("bookings")} />
        </ActionPanel>
      }
    >
      <Form.Description text="They get an invite by email. The join link is copied for you." />
      <Form.Dropdown title="Type" {...itemProps.type}>
        {list.length ? (
          <Form.Dropdown.Section title="Meeting types">
            {list.map((t) => (
              <Form.Dropdown.Item
                key={t.slug}
                value={t.slug}
                title={`${t.name}, ${minutes(t.duration_min)}`}
                icon={typeIcon(t)}
              />
            ))}
          </Form.Dropdown.Section>
        ) : null}
        <Form.Dropdown.Section title="Just a length">
          {CUSTOM.map((c) => (
            <Form.Dropdown.Item key={c} value={c} title={minutes(Number(c.slice(4)))} icon={Icon.Clock} />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.Dropdown
        id="openTime"
        title="Open times"
        info={`Times you are free, shown in ${tzName()}. Choose Another time to type your own.`}
        value={picked || ""}
        onChange={(v) => v && setValue("when", new Date(v))}
      >
        <Form.Dropdown.Item value="" title="Another time" icon={Icon.Pencil} />
        {openGroups.map((g) => (
          <Form.Dropdown.Section key={g.label} title={g.label}>
            {g.items.map((x) => (
              <Form.Dropdown.Item key={x} value={x} title={time(x)} icon={Icon.Clock} />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
      <Form.DatePicker title="When" type={Form.DatePicker.Type.DateTime} {...itemProps.when} />
      <Form.Separator />
      <Form.TextField title="Guest name" placeholder="Asha Rao" {...itemProps.name} />
      <Form.TextField title="Guest email" placeholder="asha@example.com" {...itemProps.email} />
      <Form.TextArea title="Note" placeholder="Optional. What it is about." {...itemProps.note} />
    </Form>
  );
}
