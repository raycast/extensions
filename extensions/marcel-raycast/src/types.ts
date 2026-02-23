export interface Quest {
  id: number;
  title: string;
  note: string;
  done: boolean;
  status: "todo" | "doing" | "done";
  difficulty: "easy" | "medium" | "hard" | "epic" | "legendary";
  xpReward: number;
  goldReward: number;
  date?: string | null;
  time?: string | null;
  updatedAt: string;
  authorId: number;
  journeyId?: number | null;
  spaceId?: number | null;
  assignedUsers?: User[];
  journey?: Journey | null;
  space?: Space | null;
}

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface Journey {
  id: number;
  title: string;
}

export interface Space {
  id: number;
  name: string;
}

export interface QuestsResponse {
  quests: Quest[];
}

export interface QuestResponse {
  quest: Quest;
}
