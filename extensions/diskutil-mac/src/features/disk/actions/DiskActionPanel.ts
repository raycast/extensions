import { Icon, Image, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type Disk from "../../../models/Disk";

/**
 * Handles the creation of action configurations for disk operations.
 * Separates UI action configuration from action execution logic (DiskActions).
 */
export class DiskActionPanel {
  constructor(private disk: Disk) {}

  /**
   * Returns an array of action configurations based on the disk's mount status.
   * Each action includes title, keyboard shortcut, icon, and callback.
   */
  getActions(postFunction: (type: "Reload" | "Refresh") => void): {
    title: string;
    shortcut?: Keyboard.Shortcut;
    icon: Image.ImageLike;
    onAction: () => void;
  }[] {
    const action = (
      title: string,
      shortcut: Keyboard.Shortcut,
      icon: Image.ImageLike,
      method: "mount" | "unmount" | "eject" | "revealInFinder" | "showDetailCustomTerminal"
    ) => ({
      title,
      shortcut,
      icon,
      onAction: () => {
        this.disk[method]().finally(
          () =>
            (method === "mount" || method === "unmount" || method === "eject") &&
            postFunction(method === "eject" ? "Reload" : "Refresh")
        );
      },
    });

    const failureAction = (title: string, message?: string) => ({
      title,
      icon: Icon.Warning,
      onAction: () => showFailureToast(message, { title: `${this.disk.identifier} ${title}` }),
    });

    switch (this.disk.mountStatus) {
      case "Mounted":
        return [
          action("Unmount Volume", { modifiers: ["cmd"], key: "e" }, Icon.Eject, "unmount"),
          action("Eject Full Drive", { modifiers: ["opt"], key: "e" }, Icon.Eject, "eject"),
          action("Reveal in Finder", { modifiers: ["cmd"], key: "f" }, Icon.Eye, "revealInFinder"),
          action("Terminal Info", { modifiers: ["cmd"], key: "i" }, Icon.Info, "showDetailCustomTerminal"),
        ];
      case "Unmounted":
        return [
          action("Mount Volume", { modifiers: ["cmd"], key: "e" }, Icon.ArrowDown, "mount"),
          action("Eject Full Drive", { modifiers: ["opt"], key: "e" }, Icon.Eject, "eject"),
          action("Terminal Info", { modifiers: ["cmd"], key: "i" }, Icon.Info, "showDetailCustomTerminal"),
        ];
      case "Whole":
        return [
          action("Unmount All Volumes", { modifiers: ["cmd"], key: "e" }, Icon.Eject, "unmount"),
          action("Mount All Volumes", { modifiers: ["cmd", "shift"], key: "e" }, Icon.ArrowDown, "mount"),
          action("Eject Drive", { modifiers: ["opt"], key: "e" }, Icon.Eject, "eject"),
          action("Terminal Info", { modifiers: ["cmd"], key: "i" }, Icon.Info, "showDetailCustomTerminal"),
        ];
      case "NOFS":
        return [
          action("Eject", { modifiers: ["opt"], key: "e" }, Icon.Eject, "eject"),
          action("Terminal Info", { modifiers: ["cmd"], key: "i" }, Icon.Info, "showDetailCustomTerminal"),
          failureAction("NOFS"),
        ];
      case "Container":
        return [
          action("Eject All Volumes", { modifiers: ["opt"], key: "e" }, Icon.Eject, "eject"),
          action("Terminal Info", { modifiers: ["cmd"], key: "i" }, Icon.Info, "showDetailCustomTerminal"),
        ];
      case "Timed Out":
        return [
          action("Unmount Disk", { modifiers: ["cmd"], key: "e" }, Icon.Eject, "unmount"),
          action("Mount Disk", { modifiers: ["cmd", "shift"], key: "e" }, Icon.ArrowDown, "mount"),
          action("Eject Disk", { modifiers: ["opt"], key: "e" }, Icon.Eject, "eject"),
          action("Info in Custom Terminal", { modifiers: ["cmd"], key: "t" }, Icon.Info, "showDetailCustomTerminal"),
        ];
      default:
        return [
          failureAction("Mountability Unknown", "Shouldn't happen. Try reloading or so"),
          action("Unmount Disk", { modifiers: ["cmd"], key: "e" }, Icon.Eject, "unmount"),
          action("Mount Disk", { modifiers: ["cmd", "shift"], key: "e" }, Icon.ArrowDown, "mount"),
          action("Terminal Info", { modifiers: ["cmd"], key: "i" }, Icon.Info, "showDetailCustomTerminal"),
        ];
    }
  }
}
