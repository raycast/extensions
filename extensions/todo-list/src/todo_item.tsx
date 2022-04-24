import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import {
  editingAtom,
  newTodoTextAtom,
  searchBarTextAtom,
  searchModeAtom,
  todoAtom,
  TodoItem,
  TodoSections,
} from "./atoms";
import { useAtom } from "jotai";
import { SECTIONS_DATA } from "./config";
import _ from "lodash";
import { insertIntoSection, compare } from "./utils";
import DeleteAllAction from "./delete_all";
import SearchModeAction from "./search_mode_action";
import OpenUrlAction from "./open_url_action";
import ListActions from "./list_actions";
import { useMemo } from "react";
import urlRegexSafe from "url-regex-safe";

const SingleTodoItem = ({ item, idx, sectionKey }: { item: TodoItem; idx: number; sectionKey: keyof TodoSections }) => {
  const [todoSections, setTodoSections] = useAtom(todoAtom);
  const [newTodoText] = useAtom(newTodoTextAtom);
  const [, setSearchBarText] = useAtom(searchBarTextAtom);
  const [editing, setEditing] = useAtom(editingAtom);
  const [searchMode, setSearchMode] = useAtom(searchModeAtom);

  const urls = useMemo(() => {
    return item.title.match(urlRegexSafe());
  }, [item.title]);

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

  const editTodo = () => {
    setEditing({
      sectionKey,
      index: idx,
    });
    setSearchBarText(item.title);
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
        searchMode || (newTodoText.length === 0 && !editing) ? (
          <ActionPanel>
            {item.completed ? (
              <Action
                title="Mark as Uncompleted"
                icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
                onAction={() => markTodo()}
              />
            ) : (
              <Action
                title="Mark as Completed"
                icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
                onAction={() => markCompleted()}
              />
            )}
            <Action
              title="Edit Todo"
              icon={{ source: Icon.Pencil, tintColor: Color.Orange }}
              onAction={() => {
                setSearchMode(false);
                editTodo();
              }}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action
              title="Delete Todo"
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              onAction={() => deleteTodo()}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
            {sectionKey === "pinned" ? (
              <Action
                title="Unpin Todo"
                icon={{ source: Icon.Pin, tintColor: Color.Blue }}
                onAction={() => unPin()}
                shortcut={{ modifiers: ["cmd"], key: "p" }}
              />
            ) : (
              <Action
                title="Pin Todo"
                icon={{ source: Icon.Pin, tintColor: Color.Blue }}
                onAction={() => pin()}
                shortcut={{ modifiers: ["cmd"], key: "p" }}
              />
            )}
            {urls &&
              urls.length > 0 &&
              (urls.length === 1 ? (
                <OpenUrlAction
                  url={urls[0]}
                  title={`Open ${urls[0]}`}
                  shortcut={{
                    modifiers: ["cmd"],
                    key: "o",
                  }}
                />
              ) : (
                <ActionPanel.Submenu
                  title="Open URL"
                  shortcut={{
                    modifiers: ["cmd"],
                    key: "o",
                  }}
                  icon={Icon.Globe}
                >
                  {urls.map((url, idx) => (
                    <OpenUrlAction key={idx} url={url} />
                  ))}
                </ActionPanel.Submenu>
              ))}
            <DeleteAllAction />
            <SearchModeAction />
          </ActionPanel>
        ) : (
          <ListActions />
        )
      }
    />
  );
};
export default SingleTodoItem;
