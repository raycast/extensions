import "@raycast/api";

declare module "@raycast/api" {
  interface PreferenceValues {
    token: string;
    pageSize: number;
  }
}
