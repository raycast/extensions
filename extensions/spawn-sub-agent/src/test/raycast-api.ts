export const LocalStorage = {
  getItem: async (_key: string): Promise<string | undefined> => undefined,
  setItem: async (_key: string, _value: string): Promise<void> => undefined,
};

export function getPreferenceValues<T>(): T {
  return {} as T;
}

export namespace Tool {
  export type Confirmation<T> = (input: T) => Promise<unknown> | unknown;
}
