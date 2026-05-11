import { Toast } from "@raycast/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DynamicToastOptions = (...args: Array<any>) => Toast.Options;
type ToastRecord = Record<string, Record<string, DynamicToastOptions | Toast.Options>>;

const Toasts = {
  CopiedPopicon: {
    Success: {
      title: "Copied Icon",
      style: Toast.Style.Success,
    },
  },
  CopiedPopiconName: {
    Success: {
      title: "Copied Name",
      style: Toast.Style.Success,
    },
  },
} satisfies ToastRecord;

export { Toasts };
