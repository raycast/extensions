import { Color, Icon, Image, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";
import * as sudo from "sudo-prompt";

export default class Disk {
  number: number;
  identifier: string;
  size: string;
  name: string;
  details: string;
  mountStatus: string;
  type: string;
  isWhole: boolean;
  mountPoint: string | null;

  constructor(number: number, type: string, identifier: string, name: string, size: string) {
    this.number = number;
    this.identifier = identifier;
    this.name = name;
    this.size = size;
    this.type = type;
    this.mountPoint = null;
    this.details = "Initializing...";
    this.mountStatus = "Initializing...";
    this.isWhole = false;
  }

  getActions(postFunction: (type: "DiskRefresh" | "DiskUpdate") => void): {
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
        this[method]().finally(
          () =>
            (method === "mount" || method === "unmount" || method === "eject") &&
            postFunction(method === "eject" ? "DiskRefresh" : "DiskUpdate")
        );
      },
    });

    const failureAction = (title: string, icon?: Image.ImageLike, message?: string) => ({
      title,
      icon: Icon.Warning,
      onAction: () => showFailureToast(message, { title: `${this.identifier} ${title}` }),
    });

    switch (this.mountStatus) {
      case "Mounted":
        return [
          action("Unmount Volume", { modifiers: ["cmd"], key: "e" }, Icon.Eject, "unmount"),
          action("Eject Full Drive", { modifiers: ["opt"], key: "e" }, Icon.Eject, "eject"),
          action("Reveal in Finder", { modifiers: ["cmd"], key: "f" }, Icon.Eye, "revealInFinder"),
          action("Terminal Info", { modifiers: ["cmd"], key: "t" }, Icon.Info, "showDetailCustomTerminal"),
        ];
      case "Unmounted":
        return [
          action("Mount Volume", { modifiers: ["cmd"], key: "e" }, Icon.ArrowDown, "mount"),
          action("Eject Full Drive", { modifiers: ["opt"], key: "e" }, Icon.Eject, "eject"),
          action("Terminal Info", { modifiers: ["cmd"], key: "t" }, Icon.Info, "showDetailCustomTerminal"),
        ];
      case "Whole":
        return [
          action("Unmount All Volumes", { modifiers: ["cmd"], key: "e" }, Icon.Eject, "unmount"),
          action("Mount All Volumes", { modifiers: ["cmd", "shift"], key: "e" }, Icon.ArrowDown, "mount"),
          action("Eject Drive", { modifiers: ["opt"], key: "e" }, Icon.Eject, "eject"),
          action("Terminal Info", { modifiers: ["cmd"], key: "t" }, Icon.Info, "showDetailCustomTerminal"),
        ];
      case "Unmountable":
        return [
          action("Eject", { modifiers: ["opt"], key: "e" }, Icon.Eject, "eject"),
          action("Terminal Info", { modifiers: ["cmd"], key: "t" }, Icon.Info, "showDetailCustomTerminal"),
          failureAction("Unmountable"),
        ];
      case "Container":
        return [
          action("Eject All Volumes", { modifiers: ["opt"], key: "e" }, Icon.Eject, "eject"),
          action("Terminal Info", { modifiers: ["cmd"], key: "t" }, Icon.Info, "showDetailCustomTerminal"),
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
          action("Terminal Info", { modifiers: ["cmd"], key: "t" }, Icon.Info, "showDetailCustomTerminal"),
        ];
    }
  }

  async showDetailCustomTerminal() {
    const command = `diskutil info ${this.identifier}`;

    // Execute AppleScript to open a new Terminal window and run the command
    const fullCommand = `
      osascript -e 'tell application "Terminal"
        activate
        do script "${command}"
        delay 1
        set frontmost of the first window to true
      end tell'
    `;

    showToast({
      style: Toast.Style.Animated,
      title: `Opening new terminal...`,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000)); // delay
    showToast({
      style: Toast.Style.Success,
      title: `Opened new terminal`,
    });
    try {
      await Disk.execCommand(fullCommand);
    } catch (error) {
      showFailureToast(error, { title: "Failed to open terminal" });
    }
  }

  async revealInFinder() {
    try {
      if (!this.mountPoint) {
        throw new Error("No mount point available");
      }
      await Disk.execCommand(`open "${this.mountPoint}"`);
    } catch (error) {
      showFailureToast(error, { title: "Reveal in Finder Error" });
    }
  }

  async eject() {
    showToast({
      style: Toast.Style.Animated,
      title: `Ejecting ${this.identifier}`,
    });
    try {
      await Disk.execCommand(`diskutil eject "${this.identifier}"`);
      await showToast({
        style: Toast.Style.Success,
        title: `Ejected ${this.identifier}`,
      });
    } catch (error) {
      showFailureToast(`${error} Only external drives or disk images can be ejected`, { title: "Ejection Error" });
    }
  }

  isDetailsTimedOut(): boolean {
    return this.details.includes("ERROR: Initialization Timed Out");
  }

  async handleMountAction(isMount: boolean) {
    const action = isMount ? "mount" : "unmount";
    const diskAction = this.isWhole ? `${action}Disk` : action; //Try with mountDisk instead
    const command = `diskutil ${diskAction} ${this.identifier}`;
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
    return Disk.execCommandWithSudo(command);
  }

  private async tryCommandWithSudoFallback(command: string): Promise<string> {
    try {
      return await Disk.execCommand(command);
    } catch (error) {
      // Try with sudo
      if (
        (String(error).includes("kDAReturnNotPermitted") || String(error).includes("supported")) &&
        (await confirmAlert({ title: "Try with sudo?" }))
      ) {
        return this.tryCommandWithSudo(command);
      } else {
        throw error;
      }
    }
  }

  private showToast(action: string, message: string, style: Toast.Style): void {
    showToast({
      style,
      title: `${this.identifier} ${this.isWhole ? "All possible disks" : ""} ${
        action.charAt(0).toUpperCase() + action.slice(1)
      }${style === Toast.Style.Failure ? "-Error" : ""}`,
      message: message,
    });
  }

  async unmount() {
    await this.handleMountAction(false);
  }

  async mount() {
    await this.handleMountAction(true);
  }

  async init(): Promise<void> {
    try {
      const detailsPromise = this.fetchDetails();
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          //accept
          resolve("ERROR: Initialization Timed Out " + this.identifier);
        }, 5000); // 5 seconds timeout
      });

      this.details = String(await Promise.race([detailsPromise, timeoutPromise]));

      this.initMountStatus();
      this.initDetails();
    } catch (error) {
      this.details = "Error initializing: " + error;
    }
  }

  async fetchDetails(): Promise<string> {
    return Disk.execCommand("diskutil info " + this.identifier);
  }

  initMountStatus() {
    const mountStatusRegex = /Mounted:\s+([^\n]+)/;
    const match = this.details.match(mountStatusRegex);
    const isWhole = this.details.match(/Whole.+Yes/);
    const isApfsContainer = this.name.includes("Container");

    if (this.isDetailsTimedOut()) {
      this.mountStatus = "Timed Out";
      return;
    }

    if (isWhole) {
      this.isWhole = true;
      this.mountStatus = "Whole";
      return;
    }

    if (!match) {
      this.mountStatus = "Inaccessible";
      return;
    }

    if (isApfsContainer) {
      this.mountStatus = "Container";
      return;
    }

    switch (match[1].trim()) {
      case "Yes":
        this.mountStatus = "Mounted";
        break;
      case "No":
        this.mountStatus = "Unmounted";
        break;
      default:
        this.mountStatus = "Unmountable";
    }
  }

  initDetails() {
    const mountPointRegex = /Mount Point:(.*?(\/.*))/;
    const match = this.details.match(mountPointRegex);

    if (match && match[2]) {
      this.mountPoint = `${match[2].trim()}`;
    } else {
      this.mountPoint = null;
    }
  }

  getMountStatusAccessory() {
    let color;

    switch (this.mountStatus) {
      case "Mounted":
        color = Color.Green;
        break;
      case "Unmounted":
        color = Color.Red;
        break;
      case "Unmountable":
        color = Color.Orange;
        break;
      case "Whole":
        color = Color.Purple;
        break;
      case "Container":
        color = Color.Blue;
        break;
      default:
        color = Color.Magenta;
    }

    return { tag: { value: this.mountStatus, color } };
  }

  getFormattedSize() {
    const spaceCount = 50 - (this.name.length + this.identifier.length);
    const spaces = "\u00A0".repeat(spaceCount); // Use non-breaking space character for fixed-width spacing
    const formattedSize = `${spaces}${this.size}`;
    return formattedSize;
  }

  getDetails(): JSX.Element {
    const data = this.parseTextToDict(this.details);
    return (
      <List.Item.Detail.Metadata>
        {data.flatMap(([key, value], index) => [
          <List.Item.Detail.Metadata.Label key={`${key}-${index}`} title={key} text={value || undefined} />,
          value === null ? <List.Item.Detail.Metadata.Separator key={`separator-${index}`} /> : null,
        ])}
      </List.Item.Detail.Metadata>
    );
  }

  parseTextToDict(text: string): [string, string | null][] {
    const results: [string, string | null][] = [];
    const regex = /(.+): +(.+$)|(.+)/gm;

    for (const match of text.matchAll(regex)) {
      if (match[1] && match[2]) {
        // this is a key-value pair
        const key = match[1].trim();
        const value = match[2].trim();
        results.push([key, value]);
      } else if (match[3]) {
        // this is a heading
        results.push([match[3].trim(), null]);
      }
    }

    return results;
  }

  static execCommand(command: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      exec(command, (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  private static async execCommandWithSudo(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const options = {
        name: "Raycast Diskutil",
      };

      sudo.exec(command, options, (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout?.toString() || ""); // convert stdout to string
        }
      });
    });
  }

  static createFromString(string: string): Disk | null {
    string = string.replace(/⁨|⁩/g, "");
    const regex = /^ +(\d+):(.{27}) (.{21}.*?)([\\+|\d].+B)(.+)$/gm;
    const matches = string.matchAll(regex);
    const disks: Disk[] = [];

    for (const match of matches) {
      const number = parseInt(match[1]);
      const type = match[2].trim();
      const name = match[3].trim();
      const size = match[4].trim();
      const identifier = match[5].trim();

      const disk = new Disk(number, type, identifier, name, size);
      disks.push(disk);
    }

    if (disks.length === 0) {
      return null;
    }

    return disks[0];
  }
}
