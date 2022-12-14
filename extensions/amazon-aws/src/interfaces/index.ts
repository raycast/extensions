export interface Preferences {
  readonly defaultAction: DefaultAction;
}

export enum DefaultAction {
  OpenInBrowser = "browser",
  ViewDetails = "details",
}
