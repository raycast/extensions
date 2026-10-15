/** Same shape as Raycast's `Cache`. */
export type KeyValueStore = {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
};
