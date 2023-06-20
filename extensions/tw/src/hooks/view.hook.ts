import { Action, Color, Icon, Keyboard } from "@raycast/api";
import { TaskDecorator } from "./task.hook";
import { ExportableAction, Priority, ViewReport, isExportableAction } from "../core/types";
import { tag as asTag, project as asProject, project, tag } from "../core/helpers/fmt.helper";
import { ModifyCommand } from "./command.hook";
import { ViewType, priorities, viewFilters } from "../core/helpers/ui.helper";
import { useCachedState, useExec } from "@raycast/utils";
import { useMemo, useEffect, useState } from "react";
import { runTaskCommand, parseStringLines, buildTaskCommand } from "../core/helpers";

export const useTag = (value: string) => ({
  key: `task_dropdown_set_tag_${value}`,
  value,
  title: value,
  icon: { source: Icon.Tag, tintColor: Color.Orange },
  keywords: [value],
});

export const useFilter = (value: string, prop = viewFilters[value as ViewReport]) => ({
  key: `task_dropdown_set_filter_${value}`,
  value,
  title: prop.title,
  icon: prop.icon,
  keywords: [value],
});

export const useProject = (value: string) => ({
  key: `task_dropdown_set_project_${value}`,
  value,
  title: value,
  icon: { source: Icon.Tray, tintColor: Color.Green },
  keywords: [value],
});

export const useProjectAction = (
  item: TaskDecorator,
  project: string,
  modifyCommand: ModifyCommand,
  attrs = item.task.project == project
    ? {
        source: Icon.MinusCircle,
        tintColor: Color.Red,
        action: () => modifyCommand("project", ""),
      }
    : {
        source: Icon.PlusCircle,
        tintColor: Color.Green,
        action: () => modifyCommand("project", project),
      }
) => ({
  key: `task_${item.task.uuid}_action_project_${project}`,
  title: asProject(project),
  ...attrs,
});

export const useTagAction = (
  { task }: TaskDecorator,
  tag: string,
  modifyCommand: ModifyCommand,
  attrs = task.tags?.includes(tag)
    ? {
        source: Icon.MinusCircle,
        tintColor: Color.Red,
        action: () => modifyCommand(`-${tag}`),
      }
    : {
        source: Icon.PlusCircle,
        tintColor: Color.Green,
        action: () => modifyCommand(`+${tag}`),
      }
) => ({
  key: `task_${task.uuid}_action_tag_${tag}`,
  title: asTag(tag),
  ...attrs,
});

const getShortcut = (key: Keyboard.KeyEquivalent, ...modifiers: Keyboard.KeyModifier[]) => ({
  modifiers,
  key,
});

export const useStatusActions = {
  done: {
    title: "Done",
    icon: { source: Icon.Checkmark, tintColor: Color.Green },
    shortcut: getShortcut("enter", "cmd"),
  },
  undone: {
    title: "Undone",
    icon: { source: Icon.Undo, tintColor: Color.Yellow },
    shortcut: getShortcut("z", "cmd"),
  },
  start: {
    title: "Start Working",
    icon: { source: Icon.PlayFilled, tintColor: Color.Yellow },
    shortcut: getShortcut("s", "cmd", "opt"),
  },
  stop: {
    title: "Stop Working",
    icon: { source: Icon.PauseFilled, tintColor: Color.Yellow },
    shortcut: getShortcut("s", "cmd", "shift"),
  },
  delete: {
    title: "Delete",
    icon: Icon.Trash,
    style: Action.Style.Destructive,
    shortcut: getShortcut("delete", "cmd"),
  },
  purge: {
    title: "Purge",
    icon: Icon.MinusCircleFilled,
    style: Action.Style.Destructive,
    shortcut: getShortcut("delete", "cmd"),
  },
};

export const usePriorityAction = (
  { task }: TaskDecorator,
  command: ModifyCommand,
  priority: Priority,
  props = priorities[priority]
) => {
  if (task.priority === priority) {
    return {
      key: `task_${task.uuid}_modify_priority_${priority}`,
      title: props.label,
      icon: { source: Icon.MinusCircle, tintColor: Color.Red },
      onAction: () => command("priority", ""),
    };
  } else {
    return {
      key: `task_${task.uuid}_modify_priority_${priority}`,
      title: props.label,
      icon: { source: Icon.PlusCircle, tintColor: Color.Green },
      onAction: () => command("priority", priority),
    };
  }
};

export const useViews = (value: ExportableAction) => {
  const [revalidateTags, setRevalidateTags] = useState(true);
  const [tags, setTags] = useCachedState<string[]>("tw_tags", []);

  const [revalidateProjects, setRevalidateProjects] = useState(true);
  const [projects, setProjects] = useCachedState<string[]>("tw_projects", []);

  const [view, setView] = useCachedState<ExportableAction>("tw_view", value);
  const views = useMemo(
    () => ({
      revalidateProjects: () => setRevalidateProjects(true),
      revalidateTags: () => setRevalidateTags(true),
      tags,
      projects,
      all: [
        ...Object.keys(viewFilters).map((view) => ({
          type: "filter",
          value: view,
        })),
        ...tags.map((value) => ({
          type: "tag",
          value: tag(value),
        })),
        ...projects.map((value) => ({
          type: "project",
          value: project(value),
        })),
      ] as ViewType[],
    }),
    [tags, projects]
  );

  const onChange = (newValue: string) => {
    if (newValue !== view && isExportableAction(newValue)) {
      return setView(newValue);
    }
  };
  const goToView = {
    next: () => {
      const currentIndex = views.all.findIndex((v) => v.value === view);
      const nextIndex = currentIndex + 1;
      const nextView = views.all[nextIndex] ?? views.all[0];
      setView(nextView.value);
    },
    prev: () => {
      const currentIndex = views.all.findIndex((v) => v.value === view);
      const previousIndex = currentIndex - 1;
      const previousView = views.all[previousIndex] ?? views.all[views.all.length - 1];
      setView(previousView.value);
    },
  };

  useEffect(() => {
    runTaskCommand({ command: "_tags" }).then((data) => {
      setTags(parseStringLines(data));
    });

    runTaskCommand({ command: "_projects" }).then((data) => {
      setProjects(parseStringLines(data));
    });
  }, [revalidateTags, revalidateProjects]);

  return {
    views,
    view,
    onChange,
    goToView,
  };
};

export const useTags = () => {
  const { cmd, args } = buildTaskCommand({ command: "_tags" });
  const { isLoading, data, revalidate } = useExec(cmd, args, {
    initialData: "[]",
    keepPreviousData: true,
  });
  const tags = useMemo(() => parseStringLines(data), [data]);

  return {
    tags,
    isLoadingTags: isLoading,
    revalidateTags: revalidate,
  };
};

export const useProjects = () => {
  const { cmd, args } = buildTaskCommand({ command: "_projects" });
  const { isLoading, data, revalidate } = useExec(cmd, args, {
    initialData: "[]",
    keepPreviousData: true,
  });
  const projects = useMemo(() => parseStringLines(data), [data]);

  return {
    projects,
    isLoadingProjects: isLoading,
    revalidateProjects: revalidate,
  };
};
