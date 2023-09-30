export type PerferenceValue = {
  weekStartsOn: string;
};

export type Progress = {
  key: string;
  title: string;
  showInMenuBar: boolean;
  startDate: Date;
  endDate: Date;
  getProgressNumberFn?: any;
  pinned?: boolean;
  type?: "default" | "user";
  editable?: boolean;
  menubarTitle?: string;
  isCurrentMenubarProgress?: boolean;
};

export type ProgressBarOptions = {
  limit?: number;
};
