import { Clipboard, Toast, confirmAlert, openExtensionPreferences } from "@raycast/api";
import * as api from "./api.js";
import { catchError } from "./errors.js";
import * as git from "./git.js";
import { getCommitsText } from "./utils.js";

/**
 * Class to manage operations related to forked extensions.
 */
class Operation {
  /**
   * Flag to indicate if an operation is currently in progress.
   * @remarks We should always check if the operation is already in progress to avoid calling Git commands concurrently.
   */
  private isOperating: boolean = false;

  /**
   * Toast instance to show operation status messages.
   */
  private toast: Toast;

  constructor() {
    this.toast = new Toast({ title: "" });
  }

  /**
   * Initializes the repository by cloning it if it doesn't exist.
   */
  init = async () => {
    if (this.isOperating) return;
    try {
      this.isOperating = true;
      const gitInstalled = await git.checkIfGitIsValid();
      if (!gitInstalled) {
        confirmAlert({
          title: "Git not found",
          message: "Please setup your Git executable file path manually in the extension preferences.",
          primaryAction: {
            title: "Open Extension Preferences",
            onAction: async () => {
              await openExtensionPreferences();
            },
          },
        });
        return;
      }

      this.showToast({ title: "Initializing repository" });
      const forkedRepository = await git.initRepository();
      await git.checkIfSparseCheckoutEnabled();
      await git.setUpstream(forkedRepository);
      return forkedRepository;
    } finally {
      this.isOperating = false;
      this.hideToast();
    }
  };

  /**
   * Converts the current repository from full checkout to sparse checkout.
   */
  convertFullCheckoutToSparseCheckout = () =>
    this.spawn(
      git.convertFullCheckoutToSparseCheckout,
      "Enabling sparse checkout",
      "Enable sparse checkout successfully",
    );

  /**
   * Synchronizes the forked repository with the upstream repository both on GitHub and local.
   * @remarks This will checkout to main branch and merge the upstream main branch into it.
   */
  sync = async () =>
    this.spawn(
      async () => {
        await api.syncFork();
        await git.syncFork();
      },
      "Syncing repository",
      "Synced successfully",
    );

  /**
   * Pulls the latest changes from the remote forked repository.
   * @remarks This will checkout to main branch and merge the forked main branch into it.
   */
  pull = async () => this.spawn(async () => git.syncFork(), "Pulling changes", "Pulled successfully");

  /**
   * Forks an extension by adding it to the sparse-checkout list.
   * @param extensionFolder The folder of the extension to fork.
   */
  fork = async (extensionFolder: string) =>
    this.spawn(
      async () => {
        const forkedRepository = await git.getForkedRepository();
        if (!forkedRepository)
          throw new Error(
            "Forked repository not found. Please try to rerun the extension to initialize the repository.",
          );
        const { behind } = await api.compareTwoCommits(forkedRepository);
        if (behind > 0) {
          return new Promise<void>((resolve, reject) => {
            confirmAlert({
              title: "Repository Outdated",
              message: `Your forked repository on GitHub is ${getCommitsText(behind)} behind the upstream repository. Do you want to sync it now?`,
              primaryAction: {
                title: "Sync Now",
                onAction: catchError(async () => {
                  // Set `isOperating` to false to allow `sync` to run.
                  this.isOperating = false;
                  await this.sync();
                  // Manually show the toast again because the previous sync operation completed the toast.
                  await this.showToast({ title: "Forking extension" });
                  await git.sparseCheckoutAdd([extensionFolder]);
                  this.completeToast("Forked successfully");
                  resolve();
                }),
              },
              dismissAction: {
                title: "Fork Anyway",
                onAction: catchError(async () => {
                  await git.sparseCheckoutAdd([extensionFolder]);
                  resolve();
                }),
              },
            }).catch(reject);
          });
        } else {
          await git.sparseCheckoutAdd([extensionFolder]);
        }
      },
      "Forking extension",
      "Forked successfully",
    );

  /**
   * Removes an extension from the sparse-checkout list.
   * @param extensionFolder The folder of the extension to remove.
   */
  remove = async (extensionFolder: string) =>
    this.spawn(async () => git.sparseCheckoutRemove([extensionFolder]), "Removing extension", "Removed successfully");

  /**
   * The singleton instance version of the the `showFailureToast` method.
   * @param error An unknown error to show in the failure toast.
   * @param options Optional toast options to customize the failure toast.
   */
  showFailureToast = async (error: unknown, options?: Toast.Options) => {
    const title = error instanceof Error ? error.name : (options?.title ?? "Error");
    const message = error instanceof Error ? error.message : (options?.message ?? String(error));
    const copyLogsAction = {
      title: "Copy Logs",
      onAction: () => Clipboard.copy([title, message].join("\n")),
    };
    return this.showToast(
      {
        title,
        message,
        style: options?.style ?? Toast.Style.Failure,
        primaryAction: options?.primaryAction ?? copyLogsAction,
        secondaryAction: options?.primaryAction ? copyLogsAction : undefined,
      },
      true, // Create a new toast instance to ensure the `primaryAction.onAction` works as expected.
    );
  };

  /**
   * Executes a task with a loading toast and handles success or failure.
   * @param task The task to execute, which returns a promise with void or string.
   * @param loadingMessage The message to show while the task is loading.
   * @param completedMessage Optional message to show when the task completes successfully. If not provided, the string result of the task will be used. Otherwise, the toast will be hidden.
   */
  private spawn = async <T>(
    task: () => Promise<T>,
    loadingMessage: string,
    completedMessage?: string | Toast.Options,
  ) => {
    if (this.isOperating) return;
    try {
      this.isOperating = true;
      await git.checkIfStatusClean();
      this.showToast({ title: loadingMessage });
      const result = await task();
      if (completedMessage) {
        if (typeof completedMessage === "string") this.completeToast(completedMessage);
        else this.showToast(completedMessage, true);
      } else if (typeof result === "string") {
        this.completeToast(result);
      } else {
        this.hideToast();
      }
    } finally {
      this.isOperating = false;
    }
  };

  /**
   * Shows a loading toast with the specified title.
   * @param toastOptions The options for the toast to show.
   * @param newToast Whether to create a new toast instance. If false, it will update the existing toast instance. This is a workaround for the issue that the `Toast` instance cannot set the `primaryAction.onAction` for some unknown reason.
   */
  private showToast = async (toastOptions: Toast.Options = { title: "" }, newToast?: boolean) => {
    const { style, message, primaryAction, secondaryAction } = toastOptions;
    if (newToast) this.toast = new Toast(toastOptions);
    else {
      this.toast.title = toastOptions.title;
      this.toast.style = style ?? Toast.Style.Animated;
      if (message) this.toast.message = message;
      if (primaryAction) this.toast.primaryAction = primaryAction;
      if (secondaryAction) this.toast.secondaryAction = secondaryAction;
    }
    await this.toast.show();
  };

  /**
   * Completes the toast with a success style and the specified title.
   * @param title The title to show in the completed toast.
   */
  private completeToast = (title: string) => {
    this.toast.style = Toast.Style.Success;
    this.toast.title = title;
  };

  /**
   * Hides the current toast if it's in an animated state.
   */
  private hideToast = async () => {
    if (this.toast.style === Toast.Style.Animated) this.toast.hide();
  };
}

/**
 * Singleton instance of the Operation class to manage operations.
 */
const operation = new Operation();

export default operation;
