import { Key, Modifier } from './key';

export interface Application {
  id: string;
  name: string;
  path: string;
  key: Key;
  modifiers: Modifier[];
}
