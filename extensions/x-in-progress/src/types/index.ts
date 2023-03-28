export type PerferenceValue = {
  weekStartsOn: string;
};

export type Progress = {
  key: string;
  title: string;
  menubarTitle?: string;
  showInMenuBar: boolean;
  startDate: Date;
  endDate: Date;
  getProgressNumberFn?: any;
  pinned?: boolean;
  type?: "default" | "user";
};

export type ProgressBarOptions = {
  limit?: number;
};
