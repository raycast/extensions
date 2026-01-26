import { List, ActionPanel, Action, Icon, showToast, Toast, Form, useNavigation, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { DexAPI } from "./dex-api";
import { DexReminder } from "./types";
import { getContactDisplayName } from "./utils";
import { ContactDetailList } from "./contact-detail-list";

export default function ManageReminders() {
  const [reminders, setReminders] = useState<DexReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("upcoming");

  useEffect(() => {
    loadReminders();
  }, []);

  async function loadReminders() {
    try {
      setIsLoading(true);
      const api = new DexAPI();
      const results = await api.getAllReminders(1000);

      // Fetch contact details for each reminder
      const remindersWithContacts = await Promise.all(
        results.map(async (reminder) => {
          try {
            const contact = await api.getContact(reminder.contact_id);
            return { ...reminder, contact };
          } catch {
            return reminder;
          }
        }),
      );

      // Sort by reminder date (soonest first)
      remindersWithContacts.sort((a, b) => {
        return new Date(a.reminder_at).getTime() - new Date(b.reminder_at).getTime();
      });

      setReminders(remindersWithContacts);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load reminders",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteReminder(reminderId: string) {
    try {
      const api = new DexAPI();
      await api.deleteReminder(reminderId);
      showToast({
        style: Toast.Style.Success,
        title: "Reminder deleted",
      });
      loadReminders();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete reminder",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleMarkAsDone(reminder: DexReminder) {
    try {
      const api = new DexAPI();
      // Delete the reminder to mark it as done
      await api.deleteReminder(reminder.id);
      showToast({
        style: Toast.Style.Success,
        title: "Marked as done",
        message: reminder.contact ? getContactDisplayName(reminder.contact) : undefined,
      });
      loadReminders();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to mark as done",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleSnooze(reminder: DexReminder, days: number) {
    try {
      const api = new DexAPI();
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + days);
      await api.updateReminder(reminder.id, newDate.toISOString(), reminder.note || undefined);
      showToast({
        style: Toast.Style.Success,
        title: `Snoozed for ${days} day${days > 1 ? "s" : ""}`,
      });
      loadReminders();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to snooze",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function AddReminderForm() {
    const [contactId, setContactId] = useState("");
    const [reminderDate, setReminderDate] = useState<Date>();
    const [note, setNote] = useState("");
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Create Reminder"
              onSubmit={async () => {
                if (!contactId || !reminderDate) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Please fill all required fields",
                  });
                  return;
                }

                try {
                  const api = new DexAPI();
                  await api.createReminder(contactId, reminderDate.toISOString(), note || undefined);
                  showToast({
                    style: Toast.Style.Success,
                    title: "Reminder created",
                  });
                  pop();
                  loadReminders();
                } catch (error) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to create reminder",
                    message: error instanceof Error ? error.message : String(error),
                  });
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="contactId"
          title="Contact ID"
          placeholder="Enter contact ID from Dex"
          value={contactId}
          onChange={setContactId}
        />
        <Form.DatePicker id="reminderDate" title="Reminder Date" value={reminderDate} onChange={setReminderDate} />
        <Form.TextArea
          id="note"
          title="Note (Optional)"
          placeholder="Add a note for this reminder..."
          value={note}
          onChange={setNote}
        />
      </Form>
    );
  }

  function EditReminderForm({ reminder }: { reminder: DexReminder }) {
    const [reminderDate, setReminderDate] = useState<Date>(new Date(reminder.reminder_at));
    const [note, setNote] = useState(reminder.note || "");
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Update Reminder"
              onSubmit={async () => {
                try {
                  const api = new DexAPI();
                  await api.updateReminder(reminder.id, reminderDate.toISOString(), note);
                  showToast({
                    style: Toast.Style.Success,
                    title: "Reminder updated",
                  });
                  pop();
                  loadReminders();
                } catch (error) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to update reminder",
                    message: error instanceof Error ? error.message : String(error),
                  });
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.DatePicker id="reminderDate" title="Reminder Date" value={reminderDate} onChange={setReminderDate} />
        <Form.TextArea
          id="note"
          title="Note"
          placeholder="Add a note for this reminder..."
          value={note}
          onChange={setNote}
        />
      </Form>
    );
  }

  const formatReminderDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days ago`;
    } else if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Tomorrow";
    } else if (diffDays < 7) {
      return `In ${diffDays} days`;
    } else {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  };

  const isOverdue = (dateStr: string) => {
    return new Date(dateStr).getTime() < new Date().getTime();
  };

  const filteredReminders = reminders.filter((reminder) => {
    const now = new Date().getTime();
    const reminderTime = new Date(reminder.reminder_at).getTime();

    if (filter === "overdue") {
      return reminderTime < now;
    } else if (filter === "upcoming") {
      return reminderTime >= now;
    } else {
      return true; // "all"
    }
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search reminders..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Reminders" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="Upcoming" value="upcoming" icon={Icon.Clock} />
          <List.Dropdown.Item title="Overdue" value="overdue" icon={{ source: Icon.Clock, tintColor: Color.Red }} />
          <List.Dropdown.Item title="All" value="all" icon={Icon.List} />
        </List.Dropdown>
      }
    >
      {filteredReminders.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Clock}
          title={
            filter === "overdue"
              ? "No overdue reminders"
              : filter === "upcoming"
                ? "No upcoming reminders"
                : "No reminders"
          }
          description={
            filter === "all" && reminders.length === 0
              ? "Create your first reminder to stay in touch"
              : filter !== "all" && reminders.length > 0
                ? `Try changing the filter to see ${filter === "overdue" ? "upcoming" : "overdue"} reminders`
                : "Create your first reminder to stay in touch"
          }
          actions={
            <ActionPanel>
              <Action.Push title="Add Reminder" icon={Icon.Plus} target={<AddReminderForm />} />
            </ActionPanel>
          }
        />
      ) : (
        filteredReminders.map((reminder) => {
          const contactName = reminder.contact
            ? getContactDisplayName(reminder.contact)
            : `Contact ${reminder.contact_id}`;

          return (
            <List.Item
              key={reminder.id}
              icon={isOverdue(reminder.reminder_at) ? { source: Icon.Clock, tintColor: Color.Red } : Icon.Clock}
              title={contactName}
              subtitle={reminder.note || "No note"}
              accessories={[
                { text: formatReminderDate(reminder.reminder_at) },
                isOverdue(reminder.reminder_at) ? { tag: { value: "OVERDUE", color: Color.Red } } : {},
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Quick Actions">
                    <Action
                      title="Mark as Done"
                      icon={Icon.Checkmark}
                      onAction={() => handleMarkAsDone(reminder)}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                    />
                    {reminder.contact && (
                      <Action.Push
                        title="View Contact"
                        icon={Icon.Person}
                        target={<ContactDetailList contact={reminder.contact} />}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                    )}
                    {reminder.contact?.emails && reminder.contact.emails.length > 0 && (
                      <Action.OpenInBrowser
                        title="Send Email"
                        icon={Icon.Envelope}
                        url={`mailto:${reminder.contact.emails[0].email}`}
                        shortcut={{ modifiers: ["cmd"], key: "m" }}
                      />
                    )}
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Snooze">
                    <Action
                      title="Snooze for 1 Day"
                      icon={Icon.Clock}
                      onAction={() => handleSnooze(reminder, 1)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
                    />
                    <Action
                      title="Snooze for 3 Days"
                      icon={Icon.Clock}
                      onAction={() => handleSnooze(reminder, 3)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "3" }}
                    />
                    <Action
                      title="Snooze for 1 Week"
                      icon={Icon.Clock}
                      onAction={() => handleSnooze(reminder, 7)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "7" }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Manage">
                    <Action.Push
                      title="Edit Reminder"
                      icon={Icon.Pencil}
                      target={<EditReminderForm reminder={reminder} />}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                    <Action.Push
                      title="Add New Reminder"
                      icon={Icon.Plus}
                      target={<AddReminderForm />}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action
                      title="Delete Reminder"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDeleteReminder(reminder.id)}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
