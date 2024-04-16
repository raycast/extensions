import { Key, Modifier } from './key';

export interface Website {
  id: string;
  name: string;
  url: string;
  matchPattern: string;
  key: Key;
  modifiers: Modifier[];
}
