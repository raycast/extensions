import { ActionPanel, Color, Icon, List } from "@raycast/api";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { todoAtom, TodoItem, TodoSections } from "./atoms";
import { useAtom } from "jotai";
import { SECTIONS_DATA } from "./config";
import _ from "lodash";
import { insertIntoSection, compare } from "./utils";
import DeleteAllAction from "./delete_all";
import SearchModeAction from "./search_mode_action";

const SingleTodoItem = ({ item, idx, sectionKey }: { item: TodoItem; idx: number; sectionKey: keyof TodoSections }) => {
  const [todoSections, setTodoSections] = useAtom(todoAtom);

  const setClone = () => {
    setTodoSections(_.cloneDeep(todoSections));
  };

  const toggleCompleted = (completed: boolean) => {
    todoSections[sectionKey][idx].completed = completed;
    todoSections[sectionKey].splice(idx, 1);
    todoSections[sectionKey] = [...insertIntoSection(todoSections[sectionKey], item, compare)];
    setClone();
  };

  const moveToSection = (newSection: keyof TodoSections) => {
    if (newSection === "completed") {
      item.completed = true;
    } else if (newSection === "todo") {
      item.completed = false;
    }
    todoSections[newSection] = [...insertIntoSection(todoSections[newSection], item, compare)];
    todoSections[sectionKey].splice(idx, 1);
    setClone();
  };

  const unPin = () => {
    moveToSection(item.completed ? "completed" : "todo");
  };
  const pin = () => {
    moveToSection("pinned");
  };

  // don't change section if pinned
  const markCompleted = () => {
    if (sectionKey === "pinned") {
      toggleCompleted(true);
    } else {
      moveToSection("completed");
    }
  };

  // don't change section if pinned
  const markTodo = () => {
    if (sectionKey === "pinned") {
      toggleCompleted(false);
    } else {
      moveToSection("todo");
    }
  };

  const deleteTodo = () => {
    todoSections[sectionKey].splice(idx, 1);
    setClone();
  };

  dayjs.extend(customParseFormat);
  const datePart = dayjs(item.timeAdded).format("MMM D");
  const nowDatePart = dayjs(Date.now()).format("MMM D");
  const timePart = dayjs(item.timeAdded).format("h:mm A");
  const time = datePart === nowDatePart ? `at ${timePart}` : `on ${datePart}`;
  return (
    <List.Item
      title={item.title}
      subtitle={`Added ${time}`}
      icon={
        item.completed
          ? { source: Icon.Checkmark, tintColor: Color.Green }
          : { source: Icon.Circle, tintColor: Color.Red }
      }
      accessoryIcon={SECTIONS_DATA[sectionKey].accessoryIcon}
      actions={
        <ActionPanel>
          {item.completed ? (
            <ActionPanel.Item
              title="Mark as Uncompleted"
              icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
              onAction={() => markTodo()}
            />
          ) : (
            <ActionPanel.Item
              title="Mark as Completed"
              icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
              onAction={() => markCompleted()}
            />
          )}
          <ActionPanel.Item
            title="Delete Todo"
            icon={{ source: Icon.Trash, tintColor: Color.Red }}
            onAction={() => deleteTodo()}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          {sectionKey === "pinned" ? (
            <ActionPanel.Item
              title="Unpin Todo"
              icon={{ source: Icon.Pin, tintColor: Color.Blue }}
              onAction={() => unPin()}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
            />
          ) : (
            <ActionPanel.Item
              title="Pin Todo"
              icon={{ source: Icon.Pin, tintColor: Color.Blue }}
              onAction={() => pin()}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
            />
          )}
          <DeleteAllAction />
          <SearchModeAction />
        </ActionPanel>
      }
    />
  );
};
export default SingleTodoItem;
