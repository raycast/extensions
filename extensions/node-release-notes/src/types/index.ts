import type { FILTERS } from '../config';
import type { execOutputToStatus } from '../helpers';

export type NodeVersionElement = {
  version: string;
  date: string;
  lts?: false | string;
  isCurrent?: boolean;
  isLatest?: boolean;
};

export type FilterValue = (typeof FILTERS)[number]['value'];

export type Status = ReturnType<typeof execOutputToStatus>;
