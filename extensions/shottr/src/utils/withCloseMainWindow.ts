import { closeMainWindow, getPreferenceValues } from "@raycast/api";

export function withCloseMainWindow<T>(fn: (props: T) => unknown) {
  return async function (props: T) {
    const { closeMainWindow: shouldClose } = getPreferenceValues<Preferences>();
    if (shouldClose) await closeMainWindow();
    return fn(props);
  };
}
