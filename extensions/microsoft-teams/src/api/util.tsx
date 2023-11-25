import { Action, Icon, showToast, Toast } from "@raycast/api";
import { prefs } from "./preferences";

export function OpenUrlAction({ url }: { url: string }) {
  const desktop = prefs.urlTarget === "desktop";
  return (
    <Action.OpenInBrowser
      title={desktop ? "Open in App" : "Open in Browser"}
      icon={desktop ? Icon.AppWindow : Icon.Globe}
      url={desktop ? url.replace(/^https:/, "msteams:") : url}
    />
  );
}

export async function errorToast(error: unknown) {
  const errorText = (() => {
    if (typeof error === "string") {
      return error;
    } else if (error instanceof Error) {
      return error.message;
    } else {
      return "Unknown error";
    }
  })();
  await showToast(Toast.Style.Failure, errorText);
}

export async function catchAndToastError<Result>(f: () => Promise<Result>, errorResult?: Result) {
  try {
    return await f();
  } catch (error) {
    await errorToast(error);
    return errorResult;
  }
}
