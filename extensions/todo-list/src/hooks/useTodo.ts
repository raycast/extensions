import {
  TodoItem,
  TodoSections,
  editingAtom,
  editingTagAtom,
  editingTagNameAtom,
  searchBarTextAtom,
  todoAtom,
  editingDueDateAtom,
  editingDueDateValueAtom,
} from "../atoms";
import { compare, insertIntoSection } from "../utils";

import _ from "lodash";
import { useAtom } from "jotai";

export const useTodo = ({ item, idx, sectionKey }: { item: TodoItem; idx: number; sectionKey: keyof TodoSections }) => {
  const [todoSections, setTodoSections] = useAtom(todoAtom);
  const [, setEditing] = useAtom(editingAtom);
  const [, setEditingTag] = useAtom(editingTagAtom);
  const [, setEditingTagName] = useAtom(editingTagNameAtom);
  const [, setEditingDueDate] = useAtom(editingDueDateAtom);
  const [, setEditingDueDateValue] = useAtom(editingDueDateValueAtom);
  const [, setSearchBarText] = useAtom(searchBarTextAtom);

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

  const toggleTodo = () => {
    item.completed ? markTodo() : markCompleted();
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

  const editTodoTag = () => {
    setEditingTag({
      sectionKey,
      index: idx,
    });
    setEditingTagName(item.tag ?? "");
  };

  const editTodoDueDate = () => {
    setEditingDueDate({
      sectionKey,
      index: idx,
    });
    setEditingDueDateValue(item.dueDate ?? 0);
  };

  const setPriority = (priority?: 1 | 2 | 3) => {
    item.priority = priority;
    setClone();
  };

  return {
    editTodo,
    editTodoTag,
    editTodoDueDate,
    deleteTodo,
    markTodo,
    markCompleted,
    pin,
    unPin,
    toggleCompleted,
    toggleTodo,
    setPriority,
  };
};
