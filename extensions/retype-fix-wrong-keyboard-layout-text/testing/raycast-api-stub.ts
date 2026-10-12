/** Minimal stub so vitest can resolve @raycast/api without the real package entry. */
export const LocalStorage = {
  getItem: async (_key: string): Promise<string | undefined> => undefined,
  setItem: async (_key: string, _value: string): Promise<void> => {},
  removeItem: async (_key: string): Promise<void> => {},
};
