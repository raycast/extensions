import { AI, Color, Icon, Image } from '@raycast/api';
import { List } from './types';

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
