import { Color } from "@raycast/api";

export interface workspaceStatus  {
  workspace_Inactive : "PHASE_STOPPED",
  workspace_active : "PHASE_RUNNING",
  workspace_progressing : "PHASE_CREATED" | "PHASE_INITIALIZING" | "PHASE_STOPPING" | "PHASE_PENDING"
}

export enum branchStatus {
  diverged = "DIVERGED",
  ahead = "AHEAD",
  behind = "BEHIND",
  IDENTICAL = "IDENTICAL"
}

export enum workspaceClass {
  standard = "S",
  large = "L",
}

export enum desc {
  standard_workspace_desc = "Up to 4 vCPU, 8GB memory, 30GB disk",
  large_workspace_desc = "Up to 8 vCPU, 16GB memory, 50GB disk",
}

export enum UIColors {
  primary_dark = "#12100C",
  primary_light = "#f5f4f4",
  gitpod_gold = "#FFB45B",
  green = "#84cc18",
  grey = "#a8a29e",
  red = "#f77171",
}

export enum statusColors {
  running = "#84cc18",
  progressing = "#FFB45B",
  stopped = "#a8a29e",
  failed = "#f77171",
}

export const GitpodIcons = {
  tag_icon: {
    source: "Icons/tag.svg",
    tintColor: Color.Green
  },
  issues_icon: {
    source: "Icons/bug.svg",
    tintColor: UIColors.red
  },
  pulls_icon: {
    source: "Icons/git-pull-request.svg",
    tintColor: UIColors.gitpod_gold
  },
  branchAhead: {source: "Icons/increase.svg", tintColor: UIColors.green},
  branchBehind: { source : "Icons/decrease.svg", tintColor: UIColors.gitpod_gold},
  branchDiverged: {
    source: "Icons/workflow.svg", tintColor: UIColors.red
  },
  branchIdentical: {
    source: "Icons/issue-closed.svg",
    tintColor: UIColors.green
  },
  branchIcon: {source : "Icons/git-branch.svg", tintColor: UIColors.gitpod_gold},
  running_icon: { source: "Icons/status_icon.png", tintColor: statusColors.running },
  stopped_icon: { source: "Icons/status_icon.png", tintColor: statusColors.stopped },
  failed_icon: { source: "Icons/status_icon.png", tintColor: statusColors.failed },
  progressing_icon: { source: "Icons/status_icon.png", tintColor: statusColors.progressing },
  running_icon_menubar: { source: "Icons/status_icon_small.png", tintColor: statusColors.running },
  stopped_icon_menubar: { source: "Icons/status_icon_small.png", tintColor: statusColors.stopped },
  failed_icon_menubar: { source: "Icons/status_icon_small.png", tintColor: statusColors.failed },
  progressing_icon_menubar: { source: "Icons/status_icon_small.png", tintColor: statusColors.progressing },
  settings_icon: {source: "Icons/settings.png"},
  project_icon: {source: "Icons/projects.png"},
  docs_icon: {source: "Icons/documentation.png"},

  repoIcon : {
    source: "Icons/repo-16.svg",
    tintColor: statusColors.progressing
  },

  info_icon: { source: "Icons/info1.svg", tintColor: UIColors.red},
  link_icon: { source: "Icons/link.svg", tintColor: UIColors.gitpod_gold},

  commit_icon: {source: "Icons/git-commit.svg", tintColor: UIColors.gitpod_gold},
  dashboard_icon: {source: "Icons/dashboard1.png"},

  branch_icon: {
    source: "Icons/merge.svg",
    tintColor: statusColors.running,
  },

  gitpod_logo_primary: { source: "logo-mark.svg" },
  gitpod_logo_secondary: { source: "logo-mark.svg", tintColor: statusColors.stopped },
};
