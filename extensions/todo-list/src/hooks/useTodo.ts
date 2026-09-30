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
import { confetti } from "../utils";
import { preferences } from "../config";

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

  const updateTodo = (update: (sections: TodoSections, todo: TodoItem) => void) => {
    const sections = _.cloneDeep(todoSections);
    update(sections, sections[sectionKey][idx]);
    setTodoSections(sections);
  };

  const toggleCompleted = (completed: boolean) => {
    updateTodo((_sections, todo) => {
      todo.completed = completed;
    });
  };

  const moveToSection = (newSection: keyof TodoSections) => {
    updateTodo((sections, todo) => {
      if (newSection === "completed") todo.completed = true;
      else if (newSection === "todo") todo.completed = false;
      sections[sectionKey].splice(idx, 1);
      sections[newSection].push(todo);
    });
  };

  const unPin = () => {
    moveToSection(item.completed ? "completed" : "todo");
  };
  const pin = () => {
    moveToSection("pinned");
  };

  // don't change section if pinned
  const markCompleted = () => {
    const { useConfetti } = preferences;
    if (sectionKey === "pinned") {
      toggleCompleted(true);
    } else {
      moveToSection("completed");
    }
    if (useConfetti) confetti();
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
    if (item.completed) markTodo();
    else markCompleted();
  };

  const deleteTodo = () => {
    updateTodo((sections) => {
      sections[sectionKey].splice(idx, 1);
    });
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
    updateTodo((_sections, todo) => {
      todo.priority = priority;
    });
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
