export interface Preferences {
  email: string;
  password: string;
}

export interface SelectedWorkspace {
  identifier: string;
  name: string;
}

export interface StorageItems {
  selectedWorkspace?: string | undefined;
}
