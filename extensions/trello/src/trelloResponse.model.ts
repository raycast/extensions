export type TrelloFetchResponse = TrelloResultModel[];

export interface TrelloResultModel {
  id: string;
  desc?: string;
  labels?: Label[];
  name: string;
  url: string;
  due?: Date;
}

export interface Label {
  name: string;
}
