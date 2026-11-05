// Stand-in for @raycast/api, which only exists inside Raycast. Used by vitest via an alias.
const memory = new Map<string, string>();

export const getPreferenceValues = () => ({});

export const LocalStorage = {
  getItem: async (k: string) => memory.get(k),
  setItem: async (k: string, v: string) => void memory.set(k, v),
  removeItem: async (k: string) => void memory.delete(k),
};
