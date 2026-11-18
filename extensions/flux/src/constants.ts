import { Toast } from "@raycast/api";

export const DEFAULT_ERROR_TOAST = {
  style: Toast.Style.Failure,
  title: `Failed to access f.lux`,
  message: `Make sure f.lux is running.`,
};
