export type PreferenceValues = {
  weekStartsOn: string;
};

export type DefaultProgressId = `default:${"year" | "quarter" | "month" | "week" | "day"}`;
export type CustomProgressId = `custom:${string}`;
export type ProgressId = DefaultProgressId | CustomProgressId;

export type Progress = {
  title: string;
  pinned: boolean;
  startDate: number;
  endDate: number;
  progressNum: number;
  menubar: {
    shown: boolean;
    title: string;
  };
  showAsCommand: boolean;
} & ({ type: "default"; id: DefaultProgressId } | { type: "user"; id: CustomProgressId });

export type ProgressSnapshot = {
  allProgress: Progress[];
  commandProgressId: ProgressId;
  currMenubarProgressId: ProgressId | null;
  storageWarnings: string[];
};

export type ProgressFormValues = {
  title: string;
  menubarTitle: string;
  startDate: Date | null;
  endDate: Date | null;
  showInMenubar: boolean;
  showAsCommand: boolean;
};

export type ProgressFormErrors = Partial<Record<"title" | "menubarTitle" | "startDate" | "endDate", string>>;

export type CustomProgressValue = {
  title: string;
  menubarTitle: string;
  startDate: number;
  endDate: number;
  initialMenuBarVisible: boolean;
};
