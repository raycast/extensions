import {
  createIssue,
  listRepoAssignees,
  listRepoIssues,
  listRepoLabels,
  listRepoMilestones,
  searchIssues,
} from "./issues";
import { listNotifications, readAllNotificationStatus, updateNotificationStatus } from "./notifications";
import { listRepositories, listUserRepositories } from "./repositories";

export const api = {
  issues: {
    create: createIssue,
    listAssignees: listRepoAssignees,
    listLabels: listRepoLabels,
    listMilestones: listRepoMilestones,
    listRepo: listRepoIssues,
    search: searchIssues,
  },
  notifications: {
    list: listNotifications,
    readAll: readAllNotificationStatus,
    updateStatus: updateNotificationStatus,
  },
  repositories: {
    list: listRepositories,
    listUser: listUserRepositories,
  },
} as const;
