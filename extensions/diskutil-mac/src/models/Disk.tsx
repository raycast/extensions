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

  // Initialization state tracking
  initState: "pending" | "initializing" | "done" | "error" = "pending";
  initStartTime: number | null = null;
  initEndTime: number | null = null;

  // Helper instances for delegated responsibilities
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

    // Initialize helper instances
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

  // Delegate action methods to DiskActions
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

  /**
   * Mark when disk initialization starts
   */
  startInit(): void {
    this.initState = "initializing";
    this.initStartTime = Date.now();
  }

  /**
   * Mark when disk initialization finishes
   */
  finishInit(success: boolean): void {
    this.initState = success ? "done" : "error";
    this.initEndTime = Date.now();
  }

  /**
   * Get how long initialization took in milliseconds
   */
  get initDurationMs(): number | null {
    if (!this.initStartTime || !this.initEndTime) return null;
    return this.initEndTime - this.initStartTime;
  }

  /**
   * Check if disk is fully initialized
   */
  get isInitialized(): boolean {
    return this.initState === "done";
  }

  /**
   * Initializes the disk by fetching its details using diskutil info commands.
   * @returns Promise<void> as it sets all attributes inside the instance.
   */
  async init(): Promise<void> {
    try {
      const detailsPromise: Promise<string> = execDiskCommand(`diskutil info -plist ${this.identifier}`);
      const detailsPlainPromise: Promise<string> = execDiskCommand(`diskutil info ${this.identifier}`);
      const timeoutPromise: Promise<string> = new Promise((resolve: (value: string) => void) => {
        setTimeout(() => {
          resolve("ERROR: Initialization Timed Out " + this.identifier);
        }, 5000);
      });

      // Load both the plain text and plist versions of the disk details in parallel
      const [detailsTextValue, detailsPlistValue]: [string, string] = await Promise.all([
        Promise.race([detailsPlainPromise, timeoutPromise]),
        Promise.race([detailsPromise, timeoutPromise]),
      ]);

      // Handle timeout case first
      if (
        String(detailsPlistValue).includes("ERROR: Initialization Timed Out") ||
        String(detailsTextValue).includes("ERROR: Initialization Timed Out")
      ) {
        this.isErrored = "Timed Out";
        this.details = { error: "Timed Out" };
        this.detailsDict = { Error: "Initialization Timed Out" };
        this.mountStatus = "Timed Out";
        return;
      }

      // Parse text to dictionary, handle potential errors
      try {
        this.detailsDict = DiskParser.parseTextToDict(String(detailsTextValue));
      } catch (parseError) {
        this.isErrored = "Error";
        this.detailsDict = { Error: `Failed to parse text: ${String(parseError)}` };
        this.details = { error: `Failed to parse text: ${String(parseError)}` };
        this.mountStatus = "Error";
        return;
      }

      try {
        this.details = plist.parse(String(detailsPlistValue)) as plist.PlistObject;
        this.initDetails();
        // If details parsing succeeded, clear isErrored if previously set
        this.isErrored = null;
      } catch (plistError) {
        this.isErrored = "Error";
        this.details = { error: `Failed to parse plist: ${String(plistError)}` };
        this.detailsDict = { Error: `Failed to parse plist: ${String(plistError)}` };
        this.mountStatus = "Error";
        return;
      }
    } catch (error: unknown) {
      this.isErrored = "Error";
      this.details = { error: String(error) };
      this.detailsDict = { Error: String(error) };
      this.mountStatus = "Error";
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

  // Delegate accessor methods to DiskAccessories
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
