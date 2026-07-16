import { AI, Color, Icon, Image } from '@raycast/api';
import dayjs from 'dayjs';
import type { Area, List, Project, Todo } from './types';

export const listItems = {
  inbox: { title: 'Inbox', icon: { source: Icon.Tray, tintColor: Color.Blue } },
  today: { title: 'Today', icon: { source: Icon.Star, tintColor: Color.Yellow } },
  evening: { title: 'This Evening', icon: { source: Icon.Moon, tintColor: Color.Purple } },
  tomorrow: { title: 'Tomorrow', icon: { source: Icon.ArrowClockwise, tintColor: Color.Orange } },
  upcoming: { title: 'Upcoming', icon: { source: Icon.Calendar, tintColor: Color.Red } },
  anytime: { title: 'Anytime', icon: { source: Icon.Layers, tintColor: Color.Green } },
  someday: { title: 'Someday', icon: { source: Icon.Folder, tintColor: Color.SecondaryText } },
  logbook: { title: 'Logbook', icon: { source: Icon.CheckCircle, tintColor: Color.Green } },
  list: (list: List) => {
    return {
      title: list.name,
      icon:
        list.type === 'area'
          ? { source: Icon.Folder, tintColor: Color.Green }
          : { source: Icon.Circle, tintColor: Color.Blue },
    };
  },
};

export const statusIcons: Record<'open' | 'completed' | 'canceled', Image.ImageLike> = {
  open: Icon.Circle,
  completed: { source: Icon.CheckCircle, tintColor: Color.Blue },
  canceled: { source: Icon.XMarkCircle, tintColor: Color.SecondaryText },
};

export const menuBarStatusIcons: Record<'open' | 'completed' | 'canceled', Image.ImageLike> = {
  open: Icon.Circle,
  completed: Icon.CheckCircle,
  canceled: Icon.XMarkCircle,
};

export function getTodoIcon(todo: Todo): Image.ImageLike {
  if (todo.isProject) return { source: Icon.List, tintColor: Color.Blue };
  return statusIcons[todo.status];
}

export function getTypeIcon(type: 'area' | 'project' | 'todo'): Image.ImageLike {
  switch (type) {
    case 'area':
      return { source: Icon.Box, tintColor: Color.Green };
    case 'project':
      return { source: Icon.List, tintColor: Color.Blue };
    case 'todo':
      return Icon.Circle;
  }
}

/** Returns a dayjs object for the start of today in local time (no timezone shift). */
export function getLocalToday(): ReturnType<typeof dayjs> {
  const now = new Date();
  return dayjs(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function getDeadlineColor(dueDate: string): Color | undefined {
  const diff = dayjs(dueDate).diff(getLocalToday(), 'day');
  if (Math.abs(diff) >= 15) return undefined;
  if (diff <= 0) return Color.Red;
  return Color.Orange;
}

export function organizeLists(projects: Project[] = [], areas: Area[] = []): List[] {
  const projectsWithoutAreas = projects
    .filter((project) => !project.area)
    .map((project) => ({ ...project, type: 'project' as const }));

  const organizedAreasAndProjects: List[] = [];
  areas.forEach((area) => {
    organizedAreasAndProjects.push({ ...area, type: 'area' as const });

    const associatedProjects = projects
      .filter((project) => project.area && project.area.id === area.id)
      .map((project) => ({ ...project, type: 'project' as const }));
    organizedAreasAndProjects.push(...associatedProjects);
  });

  return [...projectsWithoutAreas, ...organizedAreasAndProjects];
}

export function getChecklistItemsWithAI(name: string, notes: string) {
  return AI.ask(
    `Break down a task into sub-tasks. The sub-tasks should be actionable. Each item should be separated by a new line. Return the sub-tasks in the same language as the task's title language.

Note that each task doesn't start with a hyphen or a number. This is important.

For example, for a task named "Fix bug", you could write:
Find the root cause
Fix the bug
Write tests to prevent regressions
Ship the fix.

Here's the task you need to break-down: "${name}"
${notes.length > 0 ? `For additional context, here are the task's notes: "${notes}"` : ''}

Sub-tasks:`,
  );
}
