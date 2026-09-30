export let createdReminders = [];
export let updatedReminders = [];
export let priorityUpdates = [];
export let titleAndNotesUpdates = [];
export let moveToListUpdates = [];
export let reminderQueries = [];
export let completedReminderQueries = [];

export function resetMockState() {
  createdReminders = [];
  updatedReminders = [];
  priorityUpdates = [];
  titleAndNotesUpdates = [];
  moveToListUpdates = [];
  reminderQueries = [];
  completedReminderQueries = [];
}

function getReminderNotes(payload) {
  let notes = payload.notes;
  if (payload.tags && payload.tags.length > 0) {
    const formattedTags = payload.tags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
    notes = notes ? `${notes}\n\n${formattedTags}` : formattedTags;
  }
  return notes ?? "";
}

export async function createReminder(payload) {
  const reminder = {
    id: `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    openUrl: "x-apple-reminderkit://REMCDReminder/123",
    attachedUrls: payload.url ? [payload.url] : [],
    url: payload.url,
    title: payload.title,
    notes: getReminderNotes(payload),
    dueDate: payload.dueDate ?? "",
    isCompleted: false,
    priority: payload.priority ?? "",
    completionDate: "",
    isRecurring: Boolean(payload.recurrence),
    recurrenceRule: payload.recurrence ? `Repeats ${payload.recurrence.frequency}` : "",
    list: payload.listId ? { id: payload.listId, title: "List", color: "#000000", isDefault: false } : null,
    location: payload.address
      ? { address: payload.address, proximity: payload.proximity ?? "", radius: payload.radius }
      : null,
    creationDate: new Date(),
  };

  createdReminders.push({ payload, result: reminder });
  return reminder;
}

export async function updateReminder(payload) {
  const reminder = {
    id: payload.reminderId,
    openUrl: `x-apple-reminderkit://REMCDReminder/${payload.reminderId}`,
    attachedUrls: payload.url ? [payload.url] : [],
    url: payload.url,
    title: payload.title ?? "Updated Reminder",
    notes: getReminderNotes(payload),
    dueDate: payload.dueDate ?? "",
    isCompleted: payload.isCompleted ?? false,
    priority: payload.priority ?? "",
    completionDate: "",
    isRecurring: Boolean(payload.recurrence),
    recurrenceRule: payload.recurrence ? `Repeats ${payload.recurrence.frequency}` : "",
    list: payload.listId ? { id: payload.listId, title: "Updated List", color: "#000000", isDefault: false } : null,
    location: null,
    creationDate: new Date(),
  };

  updatedReminders.push({ payload, result: reminder });
  return reminder;
}

export async function setPriorityStatus(payload) {
  priorityUpdates.push(payload);
}

export async function setTitleAndNotes(payload) {
  titleAndNotesUpdates.push(payload);
}

export async function moveToList(payload) {
  moveToListUpdates.push(payload);
}
export async function toggleCompletionStatus() {}
export async function setDueDate() {}
export async function deleteReminder() {}
export async function getData(listId, searchText) {
  reminderQueries.push({ listId, searchText });
  return { reminders: [], lists: [] };
}
export async function getCompletedReminders(listId, searchText) {
  completedReminderQueries.push({ listId, searchText });
  return [];
}
