// Minimal stub for @raycast/api so tests can import modules that depend on it

export const environment = {
  supportPath: "/tmp/raycast-test",
};

export const LocalStorage = {
  getItem: async () => undefined,
  setItem: async () => {},
  removeItem: async () => {},
};

export function open() {}
