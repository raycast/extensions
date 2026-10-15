/** Minimal stand-in for `@raycast/api` in unit tests. */
export const preferences: Record<string, string | undefined> = {
  API_BASE_PATH: "https://api.plane.so",
  APP_BASE_URL: "https://app.plane.so",
};

export function getPreferenceValues<T>(): T {
  return preferences as T;
}
