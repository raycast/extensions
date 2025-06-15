export type useStateType<T> = [T, React.Dispatch<React.SetStateAction<T>>];

export enum ViewLayout {
  Grid = "grid",
  List = "list",
}

export enum PrimaryAction {
  OpenDetail = "detail",
  OpenInBrowser = "browser",
}

export type Preferences = {
  apikey: string;
  view: ViewLayout;
  primaryaction: PrimaryAction;
  griditemsize: number;
  showRecentVideos: boolean;
  showRecentChannels: boolean;
};
