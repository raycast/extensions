export interface CodeforcesResponse {
  status: string;
  result: {
    problems: CodeforcesAPIProblem[];
  };
}

export interface CodeforcesAPIProblem {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
}
