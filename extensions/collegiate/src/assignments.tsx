import { List, Icon, getPreferenceValues, ActionPanel, Action, showToast, Toast, Cache } from "@raycast/api";
import { useState, useEffect } from "react";
import ical from "node-ical";
import he from "he";
import { runAppleScript } from "@raycast/utils";

interface Todo {
  id: string;
  title: string;
  isCompleted: boolean;
  date: Date;
}

interface ICalEvent {
  uid?: string;
  summary?: string;
  start?: Date;
  end?: Date;
  [key: string]: any; // Optional, for any additional properties
}

interface Preferences {
  calendarUrl: string;
}

const MILLISECONDS_IN_A_DAY = 86400000;

function FilterDropdown(props: { classTypes: ClassType[]; onClassTypeChange: (newValue: string) => void }) {
  const { classTypes, onClassTypeChange } = props;
  return (
    <List.Dropdown
      tooltip="Filter"
      storeValue={true}
      onChange={(newValue) => {
        onClassTypeChange(newValue);
      }}
    >
      <List.Dropdown.Item title="All" value={"all"} />
      <List.Dropdown.Section title="Classes">
        {classTypes.map((classType) => (
          <List.Dropdown.Item key={classType.id} title={classType.name} value={classType.id} />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Status">
        <List.Dropdown.Item title="Completed" value="completed" />
        <List.Dropdown.Item title="Not Completed" value="notCompleted" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

const cache = new Cache();

function mergeWithCachedTodos(fetchedTodos: Todo[]): Todo[] {
  const cached = cache.get("todos");
  const cachedTodos: Todo[] = cached ? JSON.parse(cached) : [];

  const mergedTodos: Todo[] = fetchedTodos.map((todo) => {
    const cachedTodo = cachedTodos.find((t) => t.id === todo.id);
    if (cachedTodo && cachedTodo.isCompleted) {
      return { ...todo, isCompleted: true };
    }
    return todo;
  });

  return mergedTodos;
}

async function addTaskToReminders(task: string) {
  const script = `
    tell application "Reminders"
      tell list "Reminders"
        make new reminder with properties {name:"${task}"}
      end tell
    end tell
  `;

  try {
    await runAppleScript(script);
    showToast(Toast.Style.Success, "Task added to Reminders!");
  } catch (error) {
    showToast(Toast.Style.Failure, "Failed to add task to Reminders");
  }
}

export default function Command() {
  const cached = cache.get("todos");
  const cachedTodos: Todo[] = cached ? JSON.parse(cached) : [];
  const [todos, setTodos] = useState<Todo[]>(cachedTodos);
  const [filterCriteria, setFilterCriteria] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      const preferences = getPreferenceValues<Preferences>();
      const url = preferences.calendarUrl;
      const events = await ical.async.fromURL(url);
      const assignments = parseEventsToTodos(events);
      const mergedAssignments = mergeWithCachedTodos(assignments);
      setTodos(mergedAssignments.sort((a, b) => a.date.getTime() - b.date.getTime()));
    }

    fetchEvents();
  }, []);

  useEffect(() => {
    cache.set("todos", JSON.stringify(todos));
  }, [todos]);

  function parseEventsToTodos(events: any): Todo[] {
    const assignments: Todo[] = [];

    for (const rawEvent of Object.values(events)) {
      const event = rawEvent as ICalEvent;
      if (!event.summary) continue;

      const isAllDay =
        event.start &&
        event.end &&
        event.start instanceof Date &&
        event.end instanceof Date &&
        event.end.getTime() - event.start.getTime() === MILLISECONDS_IN_A_DAY;
      if (!isAllDay) continue;

      const title = he.decode(event.summary);
      if (!title.includes(":")) continue;

      const isCompleted = event.end && event.end instanceof Date && event.end.getTime() < Date.now();

      assignments.push({
        id: event.uid || "",
        title,
        isCompleted,
        date: event.start || new Date(),
      });
    }

    return assignments;
  }

  async function toggleCompletion(id: string, completed: boolean) {
    setTodos((prevTodos) => prevTodos.map((todo) => (todo.id === id ? { ...todo, isCompleted: completed } : todo)));

    await showToast({
      style: Toast.Style.Success,
      title: completed ? "Event Completed" : "Event Marked as Uncompleted",
    });
  }
  const classTypes = todos.reduce((acc: ClassType[], todo) => {
    const classType = todo.title.split(":")[0];
    if (!acc.find((c) => c.name === classType)) {
      acc.push({ id: classType, name: classType });
    }
    return acc;
  }, []);
  const onClassTypeChange = (newValue: string) => {
    setFilterCriteria(newValue);
  };

  const filteredTodos = todos.filter((todo) => {
    if (!filterCriteria) return true;
    if (filterCriteria === "completed") return todo.isCompleted;
    if (filterCriteria === "notCompleted") return !todo.isCompleted;
    for (const classType of classTypes) {
      if (classType.id === filterCriteria) return todo.title.split(":")[0].includes(classType.name);
    }
    if (filterCriteria === "all") return true;
    return todo.class === filterCriteria;
  });

  return (
    <List
      filtering={true}
      searchBarPlaceholder="Filter assignments by title..."
      searchBarAccessory={<FilterDropdown classTypes={classTypes} onClassTypeChange={onClassTypeChange} />}
    >
      {filteredTodos.map((todo) => (
        <List.Item
          key={todo.id}
          icon={todo.isCompleted ? Icon.Checkmark : Icon.Circle}
          title={todo.title}
          actions={
            <ActionPanel>
              <Action
                title={todo.isCompleted ? "Uncomplete" : "Complete"}
                icon={todo.isCompleted ? Icon.Circle : Icon.Checkmark}
                onAction={() => toggleCompletion(todo.id, !todo.isCompleted)}
              />
              <Action
                title={"Clear Assignments"}
                icon={Icon.Trash}
                onAction={() => {
                  cache.clear();
                  setTodos([]);
                }}
              />
              <Action title="Export to Reminders" icon={Icon.Plus} onAction={() => addTaskToReminders(todo.title)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
