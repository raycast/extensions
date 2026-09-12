export type Book = {
  _id: string;
  name: string;
};
export type Chapter = {
  _id: string;
  chapterName: string;
};
export type Movie = {
  _id: string;
  name: string;
  runtimeInMinutes: number;
  budgetInMillions: number;
  boxOfficeRevenueInMillions: number;
  academyAwardNominations: number;
  academyAwardWins: number;
  rottenTomatoesScore: number;
};
export type Quote = {
  _id: string;
  dialog: string;
  movie: string;
  character: string;
  id: string;
};
export type Character = {
  _id: string;
  height: string;
  race: string | null;
  gender: string;
  birth: string;
  spouse: string;
  death: string;
  realm: string;
  hair: string;
  name: string;
  wikiUrl: string;
};

export type SuccessResponse<T> = {
  docs: T[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  pages: number;
};
