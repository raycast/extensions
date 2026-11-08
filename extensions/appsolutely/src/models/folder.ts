export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
}

export interface AppAssignment {
  appId: string;
  folderId: string | null;
  order: number;
  /** Records which installation owns a bundle-level assignment when copies exist. */
  appPath?: string;
}

export interface LauncherState {
  version: 1;
  folders: Folder[];
  assignments: AppAssignment[];
}

export const emptyState = (): LauncherState => ({ version: 1, folders: [], assignments: [] });
