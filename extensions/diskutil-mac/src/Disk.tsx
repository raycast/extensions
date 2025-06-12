import { Color, Icon, Image, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";
import * as sudo from "sudo-prompt";
import plist from "plist";
import { JSX } from "react";

export default class Disk {
  number: number;
  identifier: string;
  size: { sizeInt: number | null; sizeStr: string };
  freeCapacity: { sizeInt: number; sizeStr: string } | { sizeInt: null; sizeStr: null }; // Volumes/Partitions Only
  usedCapacity: { sizeInt: number; sizeStr: string } | { sizeInt: null; sizeStr: null };
  volumeSize: { sizeInt: number; sizeStr: string } | { sizeInt: null; sizeStr: null };
  name: string;
  details: plist.PlistObject;
  detailsOld: string;
  mountStatus: string;
  type: string;
  isTimedOut: boolean;
  isWhole: boolean;
  internal: boolean | null;
  mountPoint: string | null;
  fileSystem: string | null;

  constructor(number: number, type: string, identifier: string, name: string, size: string) {
    this.number = number;
    this.identifier = identifier;
    this.name = name;
    this.size = { sizeStr: size, sizeInt: null };
    this.freeCapacity = { sizeInt: null, sizeStr: null };
    this.usedCapacity = { sizeInt: null, sizeStr: null };
    this.volumeSize = { sizeInt: null, sizeStr: null };
    this.type = type;
    this.internal = null;
    this.isTimedOut = false;
    this.fileSystem = null;
    this.mountPoint = null;
    this.details = { status: "Initializing..." };
    this.detailsOld = "Initializing...";
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
    await this.openCommandInTerminal(command);
  }

  async openCommandInTerminal(command: string) {
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
    await new Promise((resolve) => setTimeout(resolve, 690)); // delay
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

    if (this.internal) {
      showFailureToast("Internal drives cannot be ejected", { title: "Can't eject internal drives" });
      return;
    }

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
      const errStr = String(error);
      const needsSudo = errStr.includes("kDAReturnNotPermitted") || errStr.includes("supported");
      if (needsSudo && (await confirmAlert({ title: "Try with sudo?" }))) {
        try {
          return await this.tryCommandWithSudo(command);
        } catch (sudoError) {
          showFailureToast(sudoError, { title: "Sudo Error" });
          if (await confirmAlert({ title: "Didn't work either. Try manually in terminal?" })) {
            await this.openCommandInTerminal(command);
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
      const detailsPromise: Promise<string> = Disk.execCommand(`diskutil info -plist ${this.identifier}`);
      const detailsPlainPromise: Promise<string> = Disk.execCommand(`diskutil info ${this.identifier}`);
      const timeoutPromise: Promise<string> = new Promise((resolve: (value: string) => void) => {
        setTimeout(() => {
          resolve("ERROR: Initialization Timed Out " + this.identifier);
        }, 5000);
      });
      // Load both the plain text and plist versions of the disk details in parallel
      const [detailsOldValue, rawDetails]: [string, string] = await Promise.all([
        Promise.race([detailsPlainPromise, timeoutPromise]),
        Promise.race([detailsPromise, timeoutPromise]),
      ]);
      this.detailsOld = String(detailsOldValue);

      if (String(rawDetails).includes("ERROR: Initialization Timed Out")) {
        this.isTimedOut = true;
        return;
      }

      this.details = plist.parse(rawDetails) as plist.PlistObject;

      this.initDetails();
    } catch (error) {
      this.details = { error: String(error) };
      this.detailsOld = "ERROR: " + error;
    }
  }

  async fetchPlistDetails(): Promise<string> {
    //return Disk.execCommand("diskutil info " + this.identifier);
    return Disk.execCommand(`diskutil info -plist ${this.identifier}`);
  }

  chooseMountStatus(): string {
    if (this.isTimedOut) return "Timed Out";
    if (this.details.WholeDisk) {
      this.isWhole = true;
      return "Whole";
    }
    if ((this.details.Content as string).includes("Apple_APFS")) return "Container";
    return this.details.MountPoint ? "Mounted" : "Unmounted";
  }

  initDetails() {
    this.mountStatus = this.chooseMountStatus();
    this.mountPoint = this.details.MountPoint ? (this.details.MountPoint as string) : null;
    this.internal = typeof this.details.Internal === "boolean" ? this.details.Internal : null;
    this.fileSystem = this.details.FilesystemName ? (this.details.FilesystemName as string) : null;
    this.initSizes();
  }

  initSizes() {
    if (this.mountStatus === "Whole" || this.mountStatus === "Container") {
      this.size.sizeInt = this.details.Size as number;
      this.freeCapacity.sizeInt = this.details.FreeSpace as number;
    }

    if (this.fileSystem?.toUpperCase() === "APFS") {
      this.freeCapacity.sizeInt = this.details.APFSContainerFree ? (this.details.APFSContainerFree as number) : null;
      this.volumeSize.sizeInt = this.details.APFSContainerSize ? (this.details.APFSContainerSize as number) : null;
      this.usedCapacity.sizeInt = this.details.CapacityInUse ? (this.details.CapacityInUse as number) : null;
    } else {
      this.freeCapacity.sizeInt = this.details.FreeSpace ? (this.details.FreeSpace as number) : null;
      this.volumeSize.sizeInt = this.details.VolumeSize ? (this.details.VolumeSize as number) : null;
      this.usedCapacity.sizeInt =
        this.volumeSize.sizeInt && this.freeCapacity.sizeInt
          ? this.volumeSize.sizeInt - this.freeCapacity.sizeInt
          : null;
    }

    this.size.sizeStr = this.size.sizeInt ? this.byteToSuffix(this.size.sizeInt) : this.size.sizeStr;
    this.freeCapacity.sizeStr = this.freeCapacity.sizeInt ? this.byteToSuffix(this.freeCapacity.sizeInt) : null;
    this.volumeSize.sizeStr = this.volumeSize.sizeInt ? this.byteToSuffix(this.volumeSize.sizeInt) : null;
    this.usedCapacity.sizeStr = this.usedCapacity.sizeInt ? this.byteToSuffix(this.usedCapacity.sizeInt) : null;
  }

  byteToSuffix(byte: number): string {
    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    let i = 0;
    while (byte >= 1000 && i < units.length) {
      byte /= 1000;
      i++;
    }
    return `${byte.toFixed(2)} ${units[i]}`;
  }

  getMountStatusAccessory() {
    const colors: Record<string, Color> = {
      Mounted: Color.Green,
      Unmounted: Color.Red,
      Unmountable: Color.Orange,
      Whole: Color.Purple,
      Container: Color.Blue,
    };

    const color = colors[this.mountStatus] || Color.Magenta;
    return { tag: { value: this.mountStatus, color } };
  }

  getSizeAccessory() {
    const colors: Record<string, Color> = {
      95: Color.Red,
      75: Color.Orange,
      50: Color.Yellow,
      25: Color.Green,
      1: Color.Green,
      0: Color.Green,
    };

    if (this.isWhole) {
      return { tag: { value: this.size.sizeStr, color: Color.Purple } };
    }
    if (this.mountStatus === "Container") {
      return { tag: { value: this.size.sizeStr, color: Color.Blue } };
    }

    if (!this.usedCapacity.sizeInt || !this.freeCapacity.sizeInt) {
      return { tag: { value: this.size.sizeStr, color: Color.Magenta } };
    }

    // Calculate used percentage based on total volume size
    //const totalSize = this.volumeSize.sizeInt || this.size.sizeInt;
    const totalSize = (this.freeCapacity.sizeInt ?? 0) + (this.usedCapacity.sizeInt ?? 0);
    const percentage = this.usedCapacity.sizeInt && totalSize ? (this.usedCapacity.sizeInt / totalSize) * 100 : 0;
    const color =
      Object.entries(colors)
        .sort((a, b) => parseInt(b[0]) - parseInt(a[0])) // Sort thresholds from highest to lowest
        .find(([threshold]) => percentage >= parseInt(threshold))?.[1] || Color.Magenta;

    const usedPercent = percentage.toFixed(0);

    const totalSizeStr = this.volumeSize.sizeStr || this.size.sizeStr || "N/A";
    const usedStr = this.usedCapacity.sizeStr || "N/A";
    const freeStr = this.freeCapacity.sizeStr || "N/A";

    // Alternatives to test out
    const capacityString = `${usedPercent}% ▲ ${usedStr} ▽ ${freeStr} ● ${totalSizeStr}`;
    const capacityString2 = `${usedPercent}% ▲ ${usedStr} ▽ ${freeStr}`;
    const capacityString3 = `${usedPercent}% ▲ ${usedStr}`;

    // Deprecated
    return {
      tag: {
        value: capacityString2,
        color,
      },
    };
  }

  /**
   * Deprecated
   * @returns
   */
  getFormattedSize() {
    const spaceCount = 50 - (this.name.length + this.identifier.length);
    const spaces = "\u00A0".repeat(spaceCount); // Use non-breaking space character for fixed-width spacing
    const formattedSize = `${spaces}${this.size.sizeStr}`;
    return formattedSize;
  }

  /**
   * @param data Recursively parsing the nested Plist Object when reading from diskutil info -plist
   * @param indent NestLevel
   * @param isArrayChild Is child of an array
   * @returns The nested metadata as JSX element
   */
  renderMetadata(data: any, indent = 0, isArrayChild = false): JSX.Element[] {
    if (Array.isArray(data)) {
      // If this array is nested inside a dict (isArrayChild true), simply flatten it without an index label.
      if (isArrayChild) {
        return data.flatMap((item) => this.renderMetadata(item, indent, true));
      } else {
        return data.flatMap((item, index) => [
          <List.Item.Detail.Metadata.Label key={`${index}-label`} title={`${"-".repeat(indent)}[${index}]`} text="" />,
          ...this.renderMetadata(item, indent + 1),
        ]);
      }
    } else if (data && typeof data === "object") {
      return Object.entries(data).flatMap(([key, value]) => {
        if (value && typeof value === "object") {
          if (Array.isArray(value)) {
            return [
              <List.Item.Detail.Metadata.Label
                key={`${key}-label`}
                title={`${"|".repeat(indent * 5)}${key}`}
                text=""
              />,
              ...this.renderMetadata(value, indent + 1, true),
            ];
          } else {
            // When the value is an object, show the key and then flatten the object with an extra row.
            return [
              <List.Item.Detail.Metadata.Label
                key={`${key}-label`}
                title={`${" ".repeat(indent * 2)}${" |".repeat(indent)} ${key}`}
                text=""
              />,
              ...this.renderMetadata(value, indent + 1),
            ];
          }
        }
        // If the value is a primitive, show the key and value (default)
        return (
          <List.Item.Detail.Metadata.Label
            key={key}
            title={`${" ".repeat(indent * 2)}${" |".repeat(indent * 1)} ${key}`}
            text={String(value)}
          />
        );
      });
    }
    return [];
  }
  getDetailsPlistSummary() {
    const dash = "—";
    const summary = [
      { key: "Disk Identifier", value: this.identifier },
      { key: "Disk Name", value: this.name },
      { key: "Disk Type", value: this.type },
      { key: "Status", value: this.mountStatus },
      { key: "Mount Point", value: this.mountPoint ?? dash },
      { key: "File System", value: this.fileSystem ?? dash },
      { key: "Size", value: this.size.sizeStr ?? dash },
      { key: "Free Capacity", value: this.freeCapacity.sizeStr ?? dash },
      { key: "Used Capacity", value: this.usedCapacity.sizeStr ?? dash },
      { key: "Total Capacity", value: this.volumeSize.sizeStr ?? dash },
    ];

    return summary.map(({ key, value }) => <List.Item.Detail.Metadata.Label key={key} title={key} text={value} />);
  }

  getDetailsPlist(): JSX.Element {
    return (
      <List.Item.Detail.Metadata>
        {this.getDetailsPlistSummary()}
        <List.Item.Detail.Metadata.Separator />
        {this.renderMetadata(this.details)}
      </List.Item.Detail.Metadata>
    );
  }

  getDetails(): JSX.Element {
    const data = this.parseTextToDict(this.detailsOld);
    return (
      <List.Item.Detail.Metadata>
        {this.getDetailsPlistSummary()}
        <List.Item.Detail.Metadata.Separator />
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
        // for normal key-value pairs
        const key = match[1].trim();
        const value = match[2].trim();
        results.push([key, value]);
      } else if (match[3]) {
        // for headings
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
          reject();
        } else {
          resolve(stdout?.toString() || ""); // convert stdout to string
        }
      });
    });
  }

  /**
   * Takes in the row string from the diskutil list command and returns a Disk object with the parsed data
   * @param string
   * @returns
   */
  static createFromString(string: string): Disk | null {
    string = string.replace(/⁨|⁩/g, "");
    // Captures info from eg
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
