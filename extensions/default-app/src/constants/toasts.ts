import { Toast } from "@raycast/api";

type ToastRecord = Record<string, Record<string, Toast.Options | ((...args: Array<unknown>) => Toast.Options)>>;

export const Toasts = {
  ChangeDefaultApp: {
    Success: {
      title: "Default App Changed",
      style: Toast.Style.Success,
    },
    Failure: {
      title: "Error Changing Default App",
      style: Toast.Style.Failure,
    },
  },
} as const satisfies ToastRecord;
