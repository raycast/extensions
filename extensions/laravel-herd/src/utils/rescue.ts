import { showFailureToast } from "@raycast/utils";
import { environment, LaunchType, showHUD } from "@raycast/api";

export function rescue<T>(callback: () => T | Promise<T>, title: string, defaultValue?: T): Promise<T> {
  try {
    const result = callback();

    if (result instanceof Promise) {
      return result.catch((error) => {
        if (environment.launchType !== LaunchType.Background) {
          showFailureToast(error, { title: title });
        } else {
          showHUD(error);
        }
        return defaultValue as T;
      });
    }
    return Promise.resolve(result);
  } catch (error: unknown) {
    if (environment.launchType !== LaunchType.Background) {
      showFailureToast(error, { title: title });
    } else {
      if (error instanceof Error) {
        showHUD(error.message.toString() || "An error occurred");
      } else {
        showHUD("An error occurred");
      }
    }
    return Promise.resolve(defaultValue as T);
  }
}
