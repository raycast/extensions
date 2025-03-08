export interface MacApp {
  name: string;
  description: string;
  iconUrl?: string;
  githubUrl: string;
  categories: string[];
}

export interface AppCategory {
  name: string;
  count: number;
}
