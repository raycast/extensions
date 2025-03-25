export interface Problem {
  id: string;
  name: string;
  contestId: number;
  index: string;
  rating?: number;
  tags: string[];
}
