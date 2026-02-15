import { Toast, confirmAlert, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execDiskCommand, openCommandInTerminal } from "../../../utils/diskUtils";
import type Disk from "../../../models/Disk";

/**
 * Handles disk-related actions like mount, unmount, eject, and reveal in Finder
 */
export class DiskActions {
  constructor(private disk: Disk) {}

  async showDetailCustomTerminal() {
    const command = `diskutil info ${this.disk.identifier}`;
    await openCommandInTerminal(command);
  }

  async revealInFinder() {
    try {
      if (!this.disk.mountPoint) {
        throw new Error("No mount point available");
      }
      await execDiskCommand(`open "${this.disk.mountPoint}"`);
    } catch (error) {
      showFailureToast(error, { title: "Reveal in Finder Error" });
    }
  }

  async eject() {
    showToast({
      style: Toast.Style.Animated,
      title: `Ejecting ${this.disk.identifier}`,
    });

    try {
      await execDiskCommand(`diskutil eject "${this.disk.identifier}"`);
      await showToast({
        style: Toast.Style.Success,
        title: `Ejected ${this.disk.identifier}`,
      });
    } catch (error) {
      showFailureToast(`${error} Only removable drives or disk images can be fully ejected.`, {
        title: "Ejection Error",
      });
    }
  }

  async unmount() {
    await this.handleMountAction(false);
  }

  async mount() {
    await this.handleMountAction(true);
  }

  private async handleMountAction(isMount: boolean) {
    const action = isMount ? "mount" : "unmount";
    const diskAction = this.disk.isWhole ? `${action}Disk` : action;
    const command = `diskutil ${diskAction} ${this.disk.identifier}`;
    this.showToast(action + "ing", "", Toast.Style.Animated);

    try {
      const output = await this.tryCommandWithSudoFallback(command);
      this.showToast(action + "ed", output, Toast.Style.Success);
    } catch (error) {
      showFailureToast(error, { title: `Error ${action}ing` });
    }
  }

  private async tryCommandWithSudo(command: string): Promise<string> {
    showToast({ style: Toast.Style.Animated, title: `Trying with sudo...`, message: "" });
    return execDiskCommand(command, { sudo: true });
  }

  private async tryCommandWithSudoFallback(command: string): Promise<string> {
    try {
      return await execDiskCommand(command);
    } catch (error) {
      const errStr = String(error);
      const needsSudo = errStr.includes("kDAReturnNotPermitted") || errStr.includes("supported");
      if (needsSudo && (await confirmAlert({ title: "Try with sudo?" }))) {
        try {
          return await this.tryCommandWithSudo(command);
        } catch (sudoError) {
          showFailureToast(sudoError, { title: "Sudo Error" });
          if (await confirmAlert({ title: "Didn't work either. Try manually in terminal?" })) {
            await openCommandInTerminal(command);
          }
          throw sudoError;
        }
      }
      throw error;
    }
  }

  private showToast(action: string, message: string, style: Toast.Style): void {
    showToast({
      style,
      title: `${this.disk.identifier} ${this.disk.isWhole ? "All possible disks" : ""} ${
        action.charAt(0).toUpperCase() + action.slice(1)
      }${style === Toast.Style.Failure ? "-Error" : ""}`,
      message: message,
    });
  }
}
