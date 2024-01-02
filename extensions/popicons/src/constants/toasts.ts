import { Toast, open } from "@raycast/api";
import { FetchPopiconsError } from "../errors/fetch-popicons-error";
import { getNewIssueUrl } from "../helpers/get-new-issue-url";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DynamicToastOptions = (...args: Array<any>) => Toast.Options;
type ToastRecord = Record<string, Record<string, DynamicToastOptions | Toast.Options>>;

const Toasts = {
  FetchPopIcons: {
    Success: {
      style: Toast.Style.Success,
      title: "Update Successful",
      message: "The latest Popicons are now available in the extension.",
    },
    Loading: {
      style: Toast.Style.Animated,
      title: "Updating Popicons",
      message: "Fetching the latest Popicons from the Popicons API.",
    },
    SuccessNewIcons: (count: number) => {
      return {
        style: Toast.Style.Success,
        title: `🎉 ${count} new Popicons added`,
      };
    },
    FetchError: (err: FetchPopiconsError, retry: () => void) => {
      return {
        style: Toast.Style.Failure,
        title: "Update Failed",
        message: err.message,
        primaryAction: {
          title: "Retry Loading Popicons",
          onAction: (toast) => {
            retry();
            toast.hide();
          },
        },
        secondaryAction: {
          title: "Report Issue",
          onAction: (toast) => {
            open(getNewIssueUrl().toString());
            toast.hide();
          },
        },
      };
    },
    OfflineError: (retry: () => void) => {
      return {
        style: Toast.Style.Failure,
        title: "You Are Offline",
        message: "The icons will be updated the next time the extension is openend.",
        primaryAction: {
          title: "Retry Loading Popicons",
          onAction: (toast) => {
            retry();
            toast.hide();
          },
        },
      };
    },
  },
} satisfies ToastRecord;

export { Toasts };
