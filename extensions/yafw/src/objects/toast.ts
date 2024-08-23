import { Toast as RaycastToast, showToast } from "@raycast/api";
import { TrimmedString } from "./trimmed.string";

/**
 * Abstraction around the raycast toast.
 * Show small notification at left bottom left corner.
 */
export class Toast {
  private currentTitle = "";

  constructor(private toast?: RaycastToast) {}

  /**
   * Show new toast or modify existing one.
   */
  show = async (options: RaycastToast.Options): Promise<void> => {
    this.currentTitle = options.title;

    if (this.toast != null) {
      if (options.title != null) {
        this.toast.title = options.title;
      }

      if (options.style != null) {
        this.toast.style = options.style;
      }

      if (options.primaryAction != null) {
        this.toast.primaryAction = options.primaryAction;
      }

      if (options.secondaryAction != null) {
        this.toast.secondaryAction = options.secondaryAction;
      }

      return;
    }

    this.toast = await showToast(options);
  };

  /**
   * Updating progress with current title modification.
   * @example `Encoding Some Path To File` -> `Encoding Some Path To F... 30%`
   */
  updateProgress = async (progress: number): Promise<void> => {
    const trimmedString = new TrimmedString(this.currentTitle, 40);

    if (this.toast == null) {
      throw new Error("Toast is not visible. Use `toast.show(...)` before");
    }

    this.toast.title = `${trimmedString} ${progress}%`;
  };
}
