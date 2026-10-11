import { Action, ActionPanel, Form, Icon, List, popToRoot, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { api, showError, Slot } from "./api";
import { withConnection } from "./connect";

type Me = { connected: boolean; booking_url: string; calendar_state?: string };
type Slots = { slots: Slot[]; timezone: string; reason?: string };

function dayOf(iso: string, tz: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: tz || undefined,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function BookMeeting() {
  const me = usePromise(async () => api<Me>("/booking"), [], {
    onError: (e) => showError(e, "Could not load booking"),
  });
  const slots = usePromise(async () => api<Slots>("/booking/slots"), [], {
    onError: (e) => showError(e, "Could not read your calendar"),
  });
  const url = me.data?.booking_url || "";
  const tz = slots.data?.timezone || "";
  const byDay = new Map<string, Slot[]>();
  for (const s of slots.data?.slots || []) {
    const d = dayOf(s.start, tz);
    byDay.set(d, [...(byDay.get(d) || []), s]);
  }
  return (
    <List isLoading={me.isLoading || slots.isLoading} searchBarPlaceholder="Filter times…">
      <List.Section title="Your link">
        {url ? (
          <List.Item
            icon={Icon.Link}
            title="Copy booking link"
            subtitle={url}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Link" content={url} />
                <Action.Paste title="Paste Link" content={url} />
                <Action.OpenInBrowser url={url} />
              </ActionPanel>
            }
          />
        ) : (
          <List.Item
            icon={Icon.Warning}
            title={
              me.data && me.data.calendar_state === "needs_reconnect"
                ? "Reconnect your calendar in BABAV"
                : "Connect a calendar in BABAV first"
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open BABAV Booking" url="https://app.babav.co/#booking" />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      {[...byDay.entries()].map(([day, list]) => (
        <List.Section key={day} title={day} subtitle={tz}>
          {list.map((s) => (
            <List.Item
              key={s.start}
              icon={Icon.Clock}
              title={s.label}
              keywords={[day]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Book Someone at This Time"
                    icon={Icon.Calendar}
                    target={<BookForm slot={s} day={day} />}
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

type Values = { name: string; email: string; phone: string; notes: string };

function BookForm({ slot, day }: { slot: Slot; day: string }) {
  async function submit(v: Values) {
    if (!v.name.trim() || (!v.email.trim() && !v.phone.trim())) {
      await showToast({ style: Toast.Style.Failure, title: "Add a name and an email or phone" });
      return;
    }
    const t = await showToast({ style: Toast.Style.Animated, title: "Booking…" });
    try {
      await api("/booking/book", {
        method: "POST",
        body: { start: slot.start, name: v.name, email: v.email, phone: v.phone, notes: v.notes },
      });
      t.style = Toast.Style.Success;
      t.title = `Booked ${day}, ${slot.label}`;
      await popToRoot();
    } catch (e) {
      t.hide();
      await showError(e, "Could not book");
    }
  }
  return (
    <Form
      navigationTitle={`${day}, ${slot.label}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Book Meeting" icon={Icon.Calendar} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`${day} at ${slot.label}. They get the invite and reminders.`} />
      <Form.TextField id="name" title="Name" />
      <Form.TextField id="email" title="Email" />
      <Form.TextField id="phone" title="Mobile" />
      <Form.TextArea id="notes" title="Notes" />
    </Form>
  );
}

export default withConnection(BookMeeting);
