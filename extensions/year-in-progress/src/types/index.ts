export type PerferenceValue = {
  weekStartsOn: string;
};

export type Progress = {
  key: string;
  title: string;
  type?: "default" | "user";
  pinned?: boolean;
  startDate: string;
  endDate: string;
  progressNum: number;
  menubar: {
    shown?: boolean;
    title?: string;
  };
};

export type ProgressBarOptions = {
  limit?: number;
};
