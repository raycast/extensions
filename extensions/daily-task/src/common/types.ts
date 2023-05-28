type taskItemType = {
  id: string;
  color: string;
  icon: string;
  title: string;
  desc: string;
  duration: string;
  disabled: boolean;
  ts: number | 0;
  sec: number | 0;
};

type taskListType = taskItemType[];

export type { taskItemType, taskListType };
