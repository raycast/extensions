import type { PullBlock } from 'roamjs-components/types/native';

export type ReversePullBlock = PullBlock & {
  ":block/_children": ReversePullBlock[];
  ":block/_refs": {":db/id": number}[]
};
