import type { GetHistoryResponse } from '../api';

export type HistoryItem = GetHistoryResponse['data'][number];

export type HistoryFormValues = {
  word: string;
  result: string;
};
