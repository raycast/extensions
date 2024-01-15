import { PlanetScaleError } from "./api";
import { showToast, Toast } from "@raycast/api";

export function mutation<T>(callback: (...args: T[]) => Promise<void>) {
  return async (...args: T[]) => {
    try {
      await callback(...args);
    } catch (error) {
      if (error instanceof PlanetScaleError) {
        await showToast({
          title: "Error",
          message: error.data.message,
          style: Toast.Style.Failure,
        });
      } else {
        throw error;
      }
    }
  };
}
