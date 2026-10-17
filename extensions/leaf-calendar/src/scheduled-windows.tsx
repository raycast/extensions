import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { describeError, leaf, showLeafError } from "./lib/leaf";
import {
  dayTitle,
  durationsUpTo,
  formatDuration,
  formatTime,
  parseLeafTime,
  splitStarts,
  toIsoLocal,
  addMinutes,
} from "./lib/time";
import type { Share, TimeRange } from "./lib/types";

const GENERIC_TITLE = "Held times";

const minutesOf = (time: TimeRange) =>
  (parseLeafTime(time.end).getTime() - parseLeafTime(time.start).getTime()) / 60_000;
const label = (time: TimeRange) =>
  `${dayTitle(parseLeafTime(time.start), new Date())}, ${formatTime(parseLeafTime(time.start))} – ${formatTime(parseLeafTime(time.end))}`;
const guestList = (share: Share) => share.guests.map((g) => g.name ?? g.email).join(", ");

/** Times you offered (from Find a Time to Meet or Leaf Calendar's share panel): book one, or delete them. */
export default function ScheduledWindows() {
  const { data, isLoading, error, revalidate, mutate } = useCachedPromise(() => leaf().call("shares.list"), [], {
    onError: showLeafError,
  });

  // Gone From The List At Once; Back Only If Leaf Calendar Refuses
  async function remove(share: Share) {
    const confirmed = await confirmAlert({
      title: "Delete these scheduled windows?",
      message: "They come off your calendar in Leaf Calendar. Anyone you sent them to can still ask for them.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }

    try {
      await mutate(leaf().call("shares.delete", { id: share.id }), {
        optimisticUpdate: (shares) => (shares ?? []).filter((s) => s.id !== share.id),
        shouldRevalidateAfter: false,
      });
      await showToast({ style: Toast.Style.Success, title: "Deleted scheduled windows" });
    } catch (err) {
      await showLeafError(err);
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Scheduled Windows" searchBarPlaceholder="Search scheduled windows">
      <List.EmptyView
        icon={error ? Icon.Warning : Icon.Bookmark}
        title={error ? describeError(error).title : "No scheduled windows"}
        description={
          error ? describeError(error).message : "Copy & Save times in Find a Time to Meet to keep them here."
        }
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
      {(data ?? []).map((share) => (
        <List.Section
          key={share.id}
          title={share.title || GENERIC_TITLE}
          subtitle={[guestList(share), share.link ? `Booking link, ${share.link.minutes} min` : ""]
            .filter(Boolean)
            .join(" · ")}
        >
          {share.times.map((time) => (
            <List.Item
              key={time.start}
              icon={share.link ? Icon.Link : Icon.Clock}
              title={label(time)}
              keywords={[share.title, ...share.guests.map((g) => g.email)]}
              accessories={[{ text: formatDuration(minutesOf(time)) }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Book a Time"
                    icon={Icon.CheckCircle}
                    target={<BookForm share={share} time={time} />}
                  />
                  <Action
                    title="Delete Scheduled Windows"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => remove(share)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

// =========================================================================
// BOOK
// =========================================================================

type BookValues = { start: string; duration: string };

/**
 * Books a time inside one saved time. Plain times become an event with the title and guests; times on a booking link
 * are booked on the provider at one of the link's starts.
 */
function BookForm({ share, time }: { share: Share; time: TimeRange }) {
  const linkMinutes = share.link?.minutes;
  const starts = splitStarts(time, linkMinutes ?? 15);
  const durations = durationsUpTo(minutesOf(time));

  const { handleSubmit, itemProps, setValidationError } = useForm<BookValues>({
    initialValues: {
      start: starts[0] ? toIsoLocal(starts[0]) : time.start,
      duration: String(durations.includes(30) ? 30 : durations[durations.length - 1]),
    },
    async onSubmit(form) {
      // A Plain Time's Event Must End Inside The Saved Time
      const end = addMinutes(parseLeafTime(form.start), Number(form.duration));
      if (!linkMinutes && end > parseLeafTime(time.end)) {
        setValidationError("duration", "That runs past the end of the saved time");
        return;
      }

      const toast = await showToast({ style: Toast.Style.Animated, title: "Booking" });
      try {
        await leaf().call("shares.book", {
          id: share.id,
          start: form.start,
          end: linkMinutes ? undefined : toIsoLocal(end),
        });
        await toast.hide();
        await showHUD(`Booked ${share.title || GENERIC_TITLE}`, { popToRootType: PopToRootType.Immediate });
      } catch (error) {
        await toast.hide();
        await showLeafError(error);
      }
    },
  });

  return (
    <Form
      navigationTitle={`Book ${share.title || GENERIC_TITLE}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Book" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Saved Time" text={label(time)} />
      {share.guests.length > 0 && <Form.Description title="Guests" text={guestList(share)} />}
      <Form.Dropdown title="Start" {...itemProps.start}>
        {starts.map((start) => (
          <Form.Dropdown.Item key={start.getTime()} value={toIsoLocal(start)} title={formatTime(start)} />
        ))}
      </Form.Dropdown>
      {linkMinutes ? (
        <Form.Description
          title="Duration"
          text={`${formatDuration(linkMinutes)}, booked on the link. The provider emails the guests.`}
        />
      ) : (
        <Form.Dropdown title="Duration" {...itemProps.duration}>
          {durations.map((minutes) => (
            <Form.Dropdown.Item key={minutes} value={String(minutes)} title={formatDuration(minutes)} />
          ))}
        </Form.Dropdown>
      )}
      {!linkMinutes && share.guests.length > 0 && (
        <Form.Description text="Guests get Google's invitation, as when you save in Leaf Calendar." />
      )}
    </Form>
  );
}
