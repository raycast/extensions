export type PerferenceValue = {
  weekStartsOn: string;
};

export type Progress = {
  title: string;
  type?: "default" | "user";
  pinned?: boolean;
  startDate: number;
  endDate: number;
  progressNum: number;
  menubar: {
    shown?: boolean;
    title?: string;
  };
  showAsCommand?: boolean;
};

export type ProgressBarOptions = {
  limit?: number;
};
