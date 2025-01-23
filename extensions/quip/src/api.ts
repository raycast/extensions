import { preferences } from './utils';

// https://quip.com/dev/automation/documentation/current#operation/searchForThreads
export const searchThreadEndpoint = (query: string, onlyMatchTitles: boolean) =>
  `${preferences.endpoint}/1/threads/search?query=${query}&only_match_titles=${onlyMatchTitles}`;

export type Thread = {
  id: string;
  title: string;
  link: string;
  created_usec: number;
  updated_usec: number;
};

export type SearchThreadResponse = {
  thread: Thread;
}[];

// https://quip.com/dev/automation/documentation/current#operation/getThreadHtmlV2
export const getThreadContentEndpoint = (id: string) => `${preferences.endpoint}/2/threads/${id}/html`;

export type GetThreadContentResponse = {
  html: string;
};
