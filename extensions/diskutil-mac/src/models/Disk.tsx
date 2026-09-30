import { Color, Image, Keyboard } from "@raycast/api";
import plist from "plist";
import { JSX } from "react";
import { execDiskCommand } from "../utils/diskUtils";
import { DiskActions } from "../features/disk/actions/DiskActions";
import { DiskAccessories } from "../features/disk/accessories/DiskAccessories";
import { DiskDetails } from "../features/disk/details/DiskDetails";
import { DiskSizeCalculator } from "../features/disk/sizes/DiskSizeCalculator";
import { DiskParser } from "../features/disk/parser/DiskParser";
import { DiskActionPanel } from "../features/disk/actions/DiskActionPanel";

export default class Disk {
  details: plist.PlistObject;
  detailsDict: Record<string, string | null>;

  number: number;
  identifier: string;

  size: { sizeInt: number | null; sizeStr: string };
  freeCapacity: { sizeInt: number; sizeStr: string } | { sizeInt: null; sizeStr: null }; // Volumes/Partitions Only
  usedCapacity: { sizeInt: number; sizeStr: string } | { sizeInt: null; sizeStr: null };
  volumeSize: { sizeInt: number; sizeStr: string } | { sizeInt: null; sizeStr: null };

  name: string;
  mountStatus: string;
  type: string;
  isErrored: "Timed Out" | "Error" | null;
  isWhole: boolean;
  removable: boolean | null;
  mountPoint: string | null;
  fileSystem: string | null;

  initState: "pending" | "initializing" | "done" | "error" = "pending";
  initStartTime: number | null = null;
  initEndTime: number | null = null;

  private actions: DiskActions;
  private accessories: DiskAccessories;
  private detailsRenderer: DiskDetails;
  private actionPanel: DiskActionPanel;

  constructor(number: number, type: string, identifier: string, name: string, size: string) {
    this.number = number;
    this.identifier = identifier;
    this.name = name;
    this.size = { sizeStr: size, sizeInt: null };
    this.freeCapacity = { sizeInt: null, sizeStr: null };
    this.usedCapacity = { sizeInt: null, sizeStr: null };
    this.volumeSize = { sizeInt: null, sizeStr: null };
    this.type = type;
    this.removable = null;
    this.isErrored = null;
    this.fileSystem = null;
    this.mountPoint = null;
    this.details = { status: "Loading..." };
    this.detailsDict = { status: "Loading..." };
    this.mountStatus = "Loading...";
    this.isWhole = false;
    this.initState = "pending";

    this.actions = new DiskActions(this);
    this.accessories = new DiskAccessories(this);
    this.actionPanel = new DiskActionPanel(this);
    this.detailsRenderer = new DiskDetails(this);
  }

  getActions(postFunction: (type: "Reload" | "Refresh") => void): {
    title: string;
    shortcut?: Keyboard.Shortcut;
    icon: Image.ImageLike;
    onAction: () => void;
  }[] {
    return this.actionPanel.getActions(postFunction);
  }

  async showDetailCustomTerminal() {
    return this.actions.showDetailCustomTerminal();
  }

  async revealInFinder() {
    return this.actions.revealInFinder();
  }

  async eject() {
    return this.actions.eject();
  }

  async unmount() {
    return this.actions.unmount();
  }

  async mount() {
    return this.actions.mount();
  }

  startInit(): void {
    this.initState = "initializing";
    this.initStartTime = Date.now();
  }

  finishInit(success: boolean): void {
    this.initState = success ? "done" : "error";
    this.initEndTime = Date.now();
  }

  get initDurationMs(): number | null {
    if (!this.initStartTime || !this.initEndTime) return null;
    return this.initEndTime - this.initStartTime;
  }

  get isInitialized(): boolean {
    return this.initState === "done";
  }

  async init(): Promise<void> {
    try {
      const [detailsTextValue, detailsPlistValue] = await Promise.all([
        execDiskCommand(`diskutil info ${this.identifier}`, { timeoutMs: 5000 }),
        execDiskCommand(`diskutil info -plist ${this.identifier}`, { timeoutMs: 5000 }),
      ]);

      try {
        this.detailsDict = DiskParser.parseTextToDict(detailsTextValue);
      } catch (parseError) {
        this.isErrored = "Error";
        this.detailsDict = { Error: `Failed to parse text: ${String(parseError)}` };
        this.details = { error: `Failed to parse text: ${String(parseError)}` };
        this.mountStatus = "Error";
        return;
      }

      try {
        this.details = plist.parse(detailsPlistValue) as plist.PlistObject;
        this.initDetails();
        this.isErrored = null;
      } catch (plistError) {
        this.isErrored = "Error";
        this.details = { error: `Failed to parse plist: ${String(plistError)}` };
        this.detailsDict = { Error: `Failed to parse plist: ${String(plistError)}` };
        this.mountStatus = "Error";
        return;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const isTimeout = message.startsWith("Timed out:");
      this.isErrored = isTimeout ? "Timed Out" : "Error";
      this.details = { error: message };
      this.detailsDict = { Error: message };
      this.mountStatus = isTimeout ? "Timed Out" : "Error";
    }
  }

  async fetchPlistDetails(): Promise<string> {
    return execDiskCommand(`diskutil info -plist ${this.identifier}`);
  }

  chooseMountStatus(): string {
    if (this.isErrored === "Timed Out") return "Timed Out";
    if (this.isErrored === "Error") return "Error";
    if (this.details.WholeDisk) {
      this.isWhole = true;
      return "Whole";
    }

    if ((this.details.Content as string | undefined)?.includes("Apple_APFS")) return "Container";

    switch (this.detailsDict.Mounted) {
      case "Yes":
        return "Mounted";
      case "No":
        return "Unmounted";
      case "Not applicable (no file system)":
        return "NOFS";
      default:
        return this.details.Mounted as string;
    }
  }

  initDetails() {
    this.mountStatus = this.chooseMountStatus();
    this.mountPoint = this.details.MountPoint ? (this.details.MountPoint as string) : null;
    this.removable = typeof this.details.Removable === "boolean" ? this.details.Removable : null;
    this.fileSystem = this.details.FilesystemName ? (this.details.FilesystemName as string) : null;

    const sizeCalculator = new DiskSizeCalculator(this);
    sizeCalculator.initSizes(this.details, this.mountStatus, this.fileSystem);
  }

  getTypeAccessory(): { tag: { value: string; color: Color } } {
    return this.accessories.getTypeAccessory();
  }

  getMountStatusAccessory(): { tag: { value: string; color: Color | string } } {
    return this.accessories.getMountStatusAccessory();
  }

  getSizeAccessory(type: "Full" | "Used" | "Free" | "UsedFree" = "Used"): {
    tag: { value: string; color: Color | string };
  } {
    return this.accessories.getSizeAccessory(type);
  }

  getDetailsPlistSummary() {
    return this.detailsRenderer.getDetailsPlistSummary();
  }

  getDetailsPlist(): JSX.Element {
    return this.detailsRenderer.getDetailsPlist();
  }

  getDetails(): JSX.Element {
    return this.detailsRenderer.getDetails();
  }
}
