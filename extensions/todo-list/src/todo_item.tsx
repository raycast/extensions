import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
import isTomorrow from "dayjs/plugin/isTomorrow";
import weekday from "dayjs/plugin/weekday";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { editingAtom, newTodoTextAtom, searchModeAtom, TodoItem, TodoSections } from "./atoms";
import { useAtom } from "jotai";
import { SECTIONS_DATA, priorityDescriptions, priorityIcons } from "./config";
import DeleteAllAction from "./delete_all";
import ClearCompletedAction from "./clear_completed";
import SearchModeAction from "./search_mode_action";
import OpenUrlAction from "./open_url_action";
import ListActions from "./list_actions";
import { useMemo } from "react";
import urlRegexSafe from "url-regex-safe";
import { useTodo } from "./hooks/useTodo";
import MarkAllIncompleteAction from "./mark_all_incomplete";
import TodoTagForm from "./todo_tag_form";
import TodoDueDateForm from "./todo_due_date_form";

dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.extend(isTomorrow);
dayjs.extend(weekday);
dayjs.extend(customParseFormat);

const dueDateAccessory = (dueDate: number): List.Item.Accessory => {
  const secondsDiff = (dueDate - Date.now()) / 1000.0;
  const color = secondsDiff > 0 ? Color.SecondaryText : Color.Red;

  const inputDate = dayjs(dueDate);
  const today = dayjs();

  if (inputDate.isToday()) {
    return { text: { value: inputDate.format("h:mm A"), color: color } };
  } else if (inputDate.isYesterday()) {
    return { text: { value: "Yesterday", color: color } };
  } else if (inputDate.isTomorrow()) {
    return { text: { value: "Tomorrow", color: color } };
  }

  const diffDays = inputDate.diff(today, "day");
  if (diffDays > 0 && diffDays <= 7) {
    return { text: { value: inputDate.format("dddd"), color: color } };
  } else if (diffDays < 0 && diffDays >= -7) {
    return { text: { value: `Last ${inputDate.format("dddd")}`, color: color } };
  }

  return { text: { value: inputDate.format("MMM D"), color: color } };
};

const SingleTodoItem = ({ item, idx, sectionKey }: { item: TodoItem; idx: number; sectionKey: keyof TodoSections }) => {
  const { editTodo, editTodoTag, editTodoDueDate, deleteTodo, markTodo, markCompleted, pin, unPin, setPriority } =
    useTodo({
      item,
      idx,
      sectionKey,
    });
  const { push } = useNavigation();

  const [newTodoText] = useAtom(newTodoTextAtom);
  const [editing] = useAtom(editingAtom);
  const [searchMode, setSearchMode] = useAtom(searchModeAtom);

  const urls = useMemo(() => {
    return item.title.match(urlRegexSafe());
  }, [item.title]);

  const datePart = dayjs(item.timeAdded).format("MMM D");
  const nowDatePart = dayjs(Date.now()).format("MMM D");
  const timePart = dayjs(item.timeAdded).format("h:mm A");
  const time = datePart === nowDatePart ? `at ${timePart}` : `on ${datePart}`;

  const accessories = useMemo(() => {
    const list: List.Item.Props["accessories"] = [];
    if (item.tag) {
      list.push({
        tag: { value: item.tag, color: Color.PrimaryText },
      });
    }
    if (item.priority !== undefined) {
      list.push({
        tooltip: "priority: " + priorityDescriptions[item.priority],
        icon: priorityIcons[item.priority],
      });
    }
    if (item.dueDate !== undefined) {
      list.push(dueDateAccessory(item.dueDate));
    }
    if (SECTIONS_DATA[sectionKey].accessoryIcon) {
      const { accessoryIcon, name } = SECTIONS_DATA[sectionKey];
      list.push({ tooltip: name, icon: accessoryIcon });
    }
    return list;
  }, [item.tag, item.priority, item.dueDate, sectionKey]);

  return (
    <List.Item
      accessories={accessories}
      actions={
        searchMode || (newTodoText.length === 0 && !editing) ? (
          <ActionPanel>
            {item.completed ? (
              <Action
                icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                onAction={() => markTodo()}
                title="Mark as Uncompleted"
              />
            ) : (
              <Action
                icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
                onAction={() => markCompleted()}
                title="Mark as Completed"
              />
            )}
            <Action
              icon={{ source: Icon.Pencil, tintColor: Color.Orange }}
              onAction={() => {
                setSearchMode(false);
                editTodo();
              }}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              title="Edit Todo"
            />
            <Action
              icon={{ source: Icon.Tag, tintColor: Color.PrimaryText }}
              onAction={() => {
                editTodoTag();
                push(<TodoTagForm />);
              }}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              title="Edit Tag"
            />
            <Action
              icon={{ source: Icon.Clock, tintColor: Color.PrimaryText }}
              onAction={() => {
                editTodoDueDate();
                push(<TodoDueDateForm />);
              }}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              title="Edit Due Date"
            />
            <Action
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              onAction={() => deleteTodo()}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              style={Action.Style.Destructive}
              title="Delete Todo"
            />
            {sectionKey === "pinned" ? (
              <Action
                icon={{ source: Icon.Pin, tintColor: Color.Blue }}
                onAction={() => unPin()}
                shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
                title="Unpin Todo"
              />
            ) : (
              <Action
                icon={{ source: Icon.Pin, tintColor: Color.Blue }}
                onAction={() => pin()}
                shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
                title="Pin Todo"
              />
            )}
            <ActionPanel.Submenu
              icon={Icon.Exclamationmark}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              title="Set Priority"
            >
              <Action onAction={() => setPriority(undefined)} title="none" />
              <Action
                autoFocus={item.priority === 1}
                icon={priorityIcons[1]}
                onAction={() => setPriority(1)}
                title="Low"
              />
              <Action
                autoFocus={item.priority === 2}
                icon={priorityIcons[2]}
                onAction={() => setPriority(2)}
                title="Medium"
              />
              <Action
                autoFocus={item.priority === 3}
                icon={priorityIcons[3]}
                onAction={() => setPriority(3)}
                title="High"
              />
            </ActionPanel.Submenu>
            {urls &&
              urls.length > 0 &&
              (urls.length === 1 ? (
                <OpenUrlAction
                  shortcut={{
                    modifiers: ["cmd"],
                    key: "o",
                  }}
                  title={`Open ${urls[0]}`}
                  url={urls[0]}
                />
              ) : (
                <ActionPanel.Submenu
                  icon={Icon.Globe}
                  shortcut={{
                    modifiers: ["cmd"],
                    key: "o",
                  }}
                  title="Open URL"
                >
                  {urls.map((url, idx) => (
                    <OpenUrlAction key={idx} url={url} />
                  ))}
                </ActionPanel.Submenu>
              ))}
            <ClearCompletedAction />
            <DeleteAllAction />
            <MarkAllIncompleteAction />
            <SearchModeAction />
          </ActionPanel>
        ) : (
          <ListActions />
        )
      }
      icon={
        item.completed
          ? { source: Icon.Checkmark, tintColor: Color.Green }
          : { source: Icon.Circle, tintColor: Color.Red }
      }
      subtitle={`Added ${time}`}
      title={item.title}
    />
  );
};
export default SingleTodoItem;
