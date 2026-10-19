import { showToast, Toast } from "@raycast/api";
import { createCopyErrorAction, getErrorMessage } from "./error-actions";

export interface ToastTitles {
  loading: string;
  success: string;
  failure: string;
}

export class ToastManager {
  private toast: Toast | null = null;
  private readonly titles: ToastTitles;

  public constructor(titles: ToastTitles) {
    this.titles = titles;
  }

  async setToLoading({
    titleOverride,
    titleSuffix,
  }: { titleOverride?: string; titleSuffix?: string } = {}): Promise<ToastManager> {
    const style = Toast.Style.Animated;
    const title = titleOverride ?? this.titles.loading;

    const finalTitle = titleSuffix ? `${title} - ${titleSuffix}` : title;
    if (this.toast) {
      this.toast.style = style;
      this.toast.title = finalTitle;
      this.toast.message = undefined;
      this.toast.primaryAction = undefined;
      this.toast.secondaryAction = undefined;
      // Property updates are fire-and-forget; awaiting show() flushes them so a
      // no-view command can't terminate before the new state is on screen.
      await this.toast.show();
    } else {
      this.toast = await showToast({
        style,
        title: finalTitle,
      });
    }

    return this;
  }

  async setToSuccess({
    titleOverride,
    titleSuffix,
  }: { titleOverride?: string; titleSuffix?: string } = {}): Promise<ToastManager> {
    const title = titleOverride ?? this.titles.success;
    const finalTitle = titleSuffix ? `${title} - ${titleSuffix}` : title;

    await this.hide();
    // Show a new toast so Raycast chooses toast or HUD using the current window state.
    this.toast = await showToast({ style: Toast.Style.Success, title: finalTitle });

    return this;
  }

  async setToFailure({
    titleOverride,
    titleSuffix,
    error,
    action,
  }: {
    titleOverride?: string;
    titleSuffix?: string;
    error?: unknown;
    action?: Toast.ActionOptions;
  } = {}): Promise<ToastManager> {
    const style = Toast.Style.Failure;
    const title = titleOverride ?? this.titles.failure;
    const finalTitle = titleSuffix ? `${title} - ${titleSuffix}` : title;
    const message = getErrorMessage(error);
    const copyErrorAction = createCopyErrorAction(message);
    const primaryAction = action ?? copyErrorAction;
    const secondaryAction = action ? copyErrorAction : undefined;

    if (this.toast) {
      this.toast.style = style;
      this.toast.title = finalTitle;
      this.toast.message = message;
      this.toast.primaryAction = primaryAction;
      this.toast.secondaryAction = secondaryAction;
      // Flush the update before the command's promise resolves and the process exits.
      await this.toast.show();
    } else {
      this.toast = await showToast({
        style,
        title: finalTitle,
        message,
        primaryAction,
        secondaryAction,
      });
    }

    return this;
  }

  async hide(): Promise<void> {
    if (!this.toast) return;

    await this.toast.hide();
    this.toast = null;
  }
}
