export interface MenuBar {
  title: string;
  subtitle: string;
  shortcut: string;
  appDisplayName: string;
  arg: string;
  uid: string;
  icon: string;
}

export interface MenuBarError {
  message: string;
  success: boolean;
}
