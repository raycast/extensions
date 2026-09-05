import { Color, Icon, Image } from "@raycast/api";

import type { IssueStateType } from "../api/project-issues";
import type { ProjectHealth, ProjectStatusType, ProjectUser } from "../api/projects";

export const projectStatusIcon: Record<ProjectStatusType, { source: Icon; tintColor: Color }> = {
  backlog: { source: Icon.Circle, tintColor: Color.SecondaryText },
  planned: { source: Icon.Circle, tintColor: Color.Blue },
  started: { source: Icon.CircleProgress50, tintColor: Color.Yellow },
  paused: { source: Icon.CircleEllipsis, tintColor: Color.Orange },
  completed: { source: Icon.CheckCircle, tintColor: Color.Green },
  canceled: { source: Icon.XMarkCircle, tintColor: Color.Red },
};

export const projectHealthColor: Record<Exclude<ProjectHealth, null>, Color> = {
  onTrack: Color.Green,
  atRisk: Color.Yellow,
  offTrack: Color.Red,
};

const issueStateIcon: Record<IssueStateType, { source: Icon; tintColor: Color }> = {
  triage: { source: Icon.Warning, tintColor: Color.Orange },
  backlog: { source: Icon.Circle, tintColor: Color.SecondaryText },
  unstarted: { source: Icon.Circle, tintColor: Color.PrimaryText },
  started: { source: Icon.CircleProgress50, tintColor: Color.Yellow },
  completed: { source: Icon.CheckCircle, tintColor: Color.Green },
  canceled: { source: Icon.XMarkCircle, tintColor: Color.SecondaryText },
};

export function getIssueStateIcon(state: { type: IssueStateType; color: string }): Image.ImageLike {
  const fallback = issueStateIcon[state.type] ?? { source: Icon.Circle, tintColor: Color.SecondaryText };
  return { source: fallback.source, tintColor: state.color ?? fallback.tintColor };
}

export function getUserAvatar(user: ProjectUser | null): Image.ImageLike {
  if (!user) {
    return { source: Icon.Person, tintColor: Color.SecondaryText };
  }

  return user.avatarUrl ? { source: user.avatarUrl, mask: Image.Mask.Circle } : Icon.Person;
}

const priorityIcon: Record<number, Image.ImageLike> = {
  0: { source: Icon.Dot, tintColor: Color.SecondaryText },
  1: { source: Icon.Warning, tintColor: Color.Red },
  2: { source: Icon.BarChart, tintColor: Color.Orange },
  3: { source: Icon.BarChart, tintColor: Color.Yellow },
  4: { source: Icon.BarChart, tintColor: Color.SecondaryText },
};

export function getPriorityIcon(priority: number): Image.ImageLike {
  return priorityIcon[priority] ?? priorityIcon[0];
}
