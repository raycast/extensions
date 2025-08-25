import { Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { pull, sparseCheckoutAdd, sparseCheckoutRemove } from "./git.js";

class Operation {
  private isOperating: boolean = false;
  private toast: Toast;

  constructor() {
    this.toast = new Toast({ title: "" });
  }

  fork = async (extensionFolder: string) =>
    this.spawn(sparseCheckoutAdd(extensionFolder), "Forking extension", "Forked successfully");

  // [TODO] Needs more checks before pulling
  pull = async () => this.spawn(pull(), "Pulling contribuions", "Pulled successfully");

  remove = async (extensionFolder: string) =>
    this.spawn(sparseCheckoutRemove(extensionFolder), "Removing extension", "Removed successfully");

  private spawn = async (task: Promise<void>, loadingMessage: string, completedMessage: string) => {
    if (this.isOperating) return;
    try {
      this.showToast(loadingMessage);
      await task;
      this.completeToast(completedMessage);
    } catch (error) {
      showFailureToast(error);
    } finally {
      this.isOperating = false;
    }
  };

  private showToast = (title: string) => {
    this.toast.style = Toast.Style.Animated;
    this.toast.title = title;
    this.toast.show();
  };

  private completeToast = (title: string) => {
    this.toast.style = Toast.Style.Success;
    this.toast.title = title;
  };
}

const operation = new Operation();

export default operation;
