export type ExtensionPreferences = Preferences.MenuBar;

export type NormalizedTask = {
  dueDateMs?: number;
  folderName?: string;
  id: string;
  listName?: string;
  name: string;
  partnerName?: string;
  statusName: string;
  statusColor?: string;
  statusType?: string;
  url: string;
  isClosed: boolean;
};

export type ResolvedView = {
  id: string;
  name?: string;
  url?: string;
};

export type CachedTaskPayload = {
  fetchedAt: string;
  resolvedViewId: string;
  resolvedViewName?: string;
  resolvedViewUrl?: string;
  tasks: NormalizedTask[];
};
