type Quest = {
  id: string;
  title: string;
  tasks: {
    name: string;
    isCompleted: boolean;
  }[];
  isStarted: boolean;
  progress: number;
};

export type { Quest };
