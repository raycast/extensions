// minimal Raycast API stub for running searchSpotlight standalone

export const getPreferenceValues = <T>(): T => {
  return {
    maxResults: 250,
    maxRecentFolders: "10",
  } as unknown as T;
};

export const environment = {
  extensionName: "finder-file-actions",
};

export const LocalStorage = {
  getItem: async (_key: string) => undefined,
  setItem: async (_key: string, _value: string) => {},
};
