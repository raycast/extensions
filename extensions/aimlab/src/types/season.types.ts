type Season = {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tasks: SeasonTasks[];
};

type SeasonTasks = {
  seasonId: string;
  taskId: string;
  sortOrder: number;
  weaponId: string;
  modeId: number;
  name: string;
};

export type { Season, SeasonTasks };
