import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { useState } from "react";
import ScheduledWindows from "./scheduled-windows";
import { describeError, leaf, showLeafError } from "./lib/leaf";
import { LeafError } from "./lib/rpc";
import GuestFields from "./components/guest-fields";
import {
  addDays,
  addMinutes,
  dayTitle,
  formatDuration,
  formatTime,
  groupByDay,
  nextHalfHour,
  parseLeafTime,
  slotsOf,
  toIsoLocal,
  USUAL_DURATIONS,
  withCurrent,
} from "./lib/time";
import type { Person, SchedulingLink, TimeRange } from "./lib/types";

const DAYS = 14;
const PLAIN = "plain";

const minutesOf = (time: TimeRange) =>
  (parseLeafTime(time.end).getTime() - parseLeafTime(time.start).getTime()) / 60_000;
const label = (time: TimeRange) => `${formatTime(parseLeafTime(time.start))} – ${formatTime(parseLeafTime(time.end))}`;

const keyOf = (time: TimeRange) => `${time.start}|${time.end}`;

/**
 * Your free times for the next two weeks, cut into slots of the length set in the command's preferences (a booking
 * link's own length when one is picked), plus any custom times you add; mark the ones to offer, then Copy & Save them as
 * Leaf Calendar's share panel does.
 */
export default function FindTimeToMeet() {
  const { slotMinutes } = getPreferenceValues<Preferences.FindTimeToMeet>();
  const [linkId, setLinkId] = useState(PLAIN);
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState<TimeRange[]>([]);

  // Booking Links, When A Scheduling Provider Is Connected (none is fine)
  const links = useCachedPromise(
    async (): Promise<SchedulingLink[]> => {
      try {
        return await leaf().call("scheduling.links");
      } catch (error) {
        if (error instanceof LeafError && error.code === "not_connected") {
          return [];
        }

        throw error;
      }
    },
    [],
    { onError: showLeafError },
  );
  const link = (links.data ?? []).find((l) => l.id === linkId);

  // Free Times, Only The Link's Open Ones When One Is Picked
  const free = useCachedPromise(
    (id: string) => {
      const from = new Date();
      return leaf().call("availability.free", {
        start: toIsoLocal(from),
        end: toIsoLocal(addDays(from, DAYS)),
        linkId: id === PLAIN ? undefined : id,
      });
    },
    [linkId],
    { onError: showLeafError },
  );

  // Slots, With Your Custom Times Among Them
  const slot = link ? link.minutes : Number(slotMinutes);
  const customKeys = custom.map(keyOf);
  const times = [...custom, ...(free.data ?? []).flatMap((time) => slotsOf(time, slot))]
    .filter((time, i, all) => all.findIndex((other) => keyOf(other) === keyOf(time)) === i)
    .sort((a, b) => parseLeafTime(a.start).getTime() - parseLeafTime(b.start).getTime());
  const picked = times.filter((time) => selected.includes(keyOf(time)));
  const now = new Date();

  function toggle(time: TimeRange) {
    const key = keyOf(time);
    setSelected((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  }

  function addCustom(time: TimeRange) {
    setCustom((current) => [...current, time]);
    setSelected((current) => [...current, keyOf(time)]);
  }

  function changeLink(id: string) {
    setLinkId(id);
    setSelected([]);
  }

  function refresh() {
    links.revalidate();
    free.revalidate();
  }

  const savedAction = (
    <Action.Push
      title="Show Scheduled Windows"
      icon={Icon.Bookmark}
      shortcut={Keyboard.Shortcut.Common.Open}
      target={<ScheduledWindows />}
    />
  );
  const customAction = (
    <Action.Push
      title="Add Custom Time"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CustomTimeForm minutes={link?.minutes} defaultMinutes={slot || 30} onAdd={addCustom} />}
    />
  );

  return (
    <List
      isLoading={free.isLoading || links.isLoading}
      searchBarPlaceholder="Search free times"
      navigationTitle={picked.length ? `${picked.length} Selected` : undefined}
      searchBarAccessory={
        <List.Dropdown tooltip="Booking Link" value={linkId} onChange={changeLink}>
          <List.Dropdown.Item title="No Booking Link" value={PLAIN} icon={Icon.Clock} />
          {(links.data ?? []).length > 0 && (
            <List.Dropdown.Section title="Booking Links">
              {(links.data ?? []).map((l) => (
                <List.Dropdown.Item key={l.id} title={`${l.name} (${l.minutes} min)`} value={l.id} icon={Icon.Link} />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={free.error ? Icon.Warning : Icon.Calendar}
        title={free.error ? describeError(free.error).title : "No free time"}
        description={
          free.error
            ? describeError(free.error).message
            : `Nothing free in your working hours over the next ${DAYS} days.`
        }
        actions={
          <ActionPanel>
            {customAction}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={refresh}
            />
            {savedAction}
          </ActionPanel>
        }
      />
      {groupByDay(times, now).map(({ day, items }) => (
        <List.Section key={day.getTime()} title={dayTitle(day, now)} subtitle={String(items.length)}>
          {items.map((time) => {
            const isSelected = selected.includes(keyOf(time));
            return (
              <List.Item
                key={keyOf(time)}
                icon={isSelected ? { source: Icon.CheckCircle, tintColor: Color.Green } : { source: Icon.Circle }}
                title={label(time)}
                accessories={[
                  ...(customKeys.includes(keyOf(time)) ? [{ tag: "Custom" }] : []),
                  { text: formatDuration(minutesOf(time)) },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title={isSelected ? "Unselect Time" : "Select Time"}
                      icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                      onAction={() => toggle(time)}
                    />
                    <Action.Push
                      title={picked.length ? `Copy & Save ${picked.length} Selected` : "Copy & Save This Time"}
                      icon={Icon.Clipboard}
                      target={<ShareForm times={picked.length ? picked : [time]} link={link} />}
                    />
                    {customAction}
                    {savedAction}
                    <Action
                      title="Clear Selection"
                      icon={Icon.XMarkCircle}
                      shortcut={Keyboard.Shortcut.Common.RemoveAll}
                      onAction={() => setSelected([])}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={refresh}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

// =========================================================================
// CUSTOM TIME
// =========================================================================

type CustomValues = { start: Date | null; duration: string };

/** A time you pick yourself, offered alongside your free slots (it's added already selected). */
function CustomTimeForm({
  minutes,
  defaultMinutes,
  onAdd,
}: {
  minutes?: number;
  defaultMinutes: number;
  onAdd: (time: TimeRange) => void;
}) {
  const { pop } = useNavigation();
  const lengths = withCurrent(USUAL_DURATIONS, defaultMinutes);
  const { handleSubmit, itemProps } = useForm<CustomValues>({
    initialValues: { start: nextHalfHour(new Date()), duration: String(minutes ?? defaultMinutes) },
    validation: {
      start: (value) => (!value ? "Pick a start" : value <= new Date() ? "Pick a time that hasn't passed" : undefined),
    },
    onSubmit(form) {
      const start = form.start!;
      onAdd({ start: toIsoLocal(start), end: toIsoLocal(addMinutes(start, Number(form.duration))) });
      pop();
    },
  });

  return (
    <Form
      navigationTitle="Add Custom Time"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Time" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker title="Start" type={Form.DatePicker.Type.DateTime} {...itemProps.start} />
      {minutes ? (
        <Form.Description title="Duration" text={`${formatDuration(minutes)}, the booking link's length`} />
      ) : (
        <Form.Dropdown title="Duration" {...itemProps.duration}>
          {lengths.map((value) => (
            <Form.Dropdown.Item key={value} value={String(value)} title={formatDuration(value)} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}

// =========================================================================
// COPY & SAVE
// =========================================================================

type ShareValues = { title: string; message: string };

function ShareForm({ times, link }: { times: TimeRange[]; link?: SchedulingLink }) {
  const [guests, setGuests] = useState<Person[]>([]);

  const { handleSubmit, itemProps } = useForm<ShareValues>({
    initialValues: { title: "", message: "" },
    async onSubmit(form) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Saving times" });
      try {
        const { text, html } = await leaf().call("shares.create", {
          times,
          title: form.title.trim() || undefined,
          message: form.message.trim() || undefined,
          guests: guests.map((guest) => ({ name: guest.name ?? undefined, email: guest.email })),
          linkId: link?.id,
        });
        await Clipboard.copy(html ? { text, html } : { text });
        await toast.hide();
        await showHUD(times.length === 1 ? "Copied 1 time" : `Copied ${times.length} times`, {
          popToRootType: PopToRootType.Immediate,
        });
      } catch (error) {
        await toast.hide();
        await showLeafError(error);
      }
    },
  });

  return (
    <Form
      navigationTitle="Copy & Save"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy & Save" icon={Icon.Clipboard} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title={times.length === 1 ? "Time" : "Times"}
        text={times.map((time) => `${dayTitle(parseLeafTime(time.start), new Date())}, ${label(time)}`).join("\n")}
      />
      {link && <Form.Description title="Booking Link" text={`${link.name} (${link.minutes} min)`} />}
      <Form.TextField
        title="Title"
        placeholder="Optional, shown on your calendar in Leaf Calendar"
        info="The event's title when you book one of these times."
        {...itemProps.title}
      />
      <GuestFields
        value={guests}
        onChange={setGuests}
        info={
          link ? "Filled into each booking link; the first is the booker." : "Invited when you book one of these times."
        }
      />
      <Form.TextArea
        title="Message"
        placeholder="Leave empty for your share message from Leaf Calendar"
        info="Put {times} where the times go."
        {...itemProps.message}
      />
    </Form>
  );
}
