import { Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import * as api from "./api.js";
import * as git from "./git.js";

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
      this.showToast("Initializing repository");
      const forkedRepository = await git.initRepository();
      await git.setUpstream(forkedRepository);
      return forkedRepository;
    } finally {
      this.isOperating = false;
      this.hideToast();
    }
  };

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
   * Forks an extension by adding it to the sparse-checkout list.
   * @param extensionFolder The folder of the extension to fork.
   */
  fork = async (extensionFolder: string) =>
    this.spawn(async () => git.sparseCheckoutAdd(extensionFolder), "Forking extension", "Forked successfully");

  /**
   * Pulls the latest changes from the upstream repository.
   *
   * [TODO] We should check if the repository is clean before pulling
   *
   * @remarks
   *
   * - If the local branch is outdated, fast-forward it;
   * - If the local branch contains unpushed work, warn about it;
   * - If the branch seems merged and its upstream branch was deleted, delete it.
   */
  pull = async () => this.spawn(git.pull, "Pulling contributions", "Pulled successfully");

  /**
   * Removes an extension from the sparse-checkout list.
   * @param extensionFolder The folder of the extension to remove.
   */
  remove = async (extensionFolder: string) =>
    this.spawn(async () => git.sparseCheckoutRemove(extensionFolder), "Removing extension", "Removed successfully");

  /**
   * Executes a task with a loading toast and handles success or failure.
   * @param task The task to execute, which returns a promise with void or string.
   * @param loadingMessage The message to show while the task is loading.
   * @param completedMessage Optional message to show when the task completes successfully. If not provided, the string result of the task will be used. Otherwise, the toast will be hidden.
   */
  private spawn = async <T>(task: () => Promise<T>, loadingMessage: string, completedMessage?: string) => {
    if (this.isOperating) return;

    const isClean = await git.isStatusClean();
    if (!isClean) {
      showFailureToast("The repository is not clean. Please commit or stash your changes before proceeding.");
      return;
    }

    try {
      this.isOperating = true;
      this.showToast(loadingMessage);
      const result = await task();
      const message = completedMessage ?? result;
      if (typeof message === "string") {
        this.completeToast(message);
      } else {
        this.hideToast();
      }
    } catch (error) {
      showFailureToast(error);
    } finally {
      this.isOperating = false;
    }
  };

  /**
   * Shows a loading toast with the specified title.
   * @param title The title of the toast to show.
   */
  private showToast = (title: string) => {
    this.toast.style = Toast.Style.Animated;
    this.toast.title = title;
    this.toast.show();
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
   * Hides the current toast if it is visible.
   */
  private hideToast = () => {
    this.toast.hide();
  };
}

/**
 * Singleton instance of the Operation class to manage operations.
 */
const operation = new Operation();

export default operation;
