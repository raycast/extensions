import { Color } from "@raycast/api";
import type Disk from "../../../models/Disk";
import { DiskSizeCalculator } from "../sizes/DiskSizeCalculator";

const NO_CAPACITY_COLOR = "#99b833ff";
const NOFS_COLOR = "#00B3AD";

/**
 * Handles rendering of accessories (tags) for disk list items
 */
export class DiskAccessories {
  constructor(private disk: Disk) {}

  /**
   * Get the type accessor tag for disk type/filesystem
   */
  getTypeAccessory(): { tag: { value: string; color: Color } } {
    // Map specific file system types to more user-friendly names
    const typeMap: { [key: string]: string } = {
      "APFS Container Scheme": "APFS Container Scheme",
      GUID_partition_scheme: "GUID Partition Scheme",
    };

    const rawType = this.disk.fileSystem || this.disk.type;
    const displayType = typeMap[rawType] || rawType || "Unknown";
    return { tag: { value: displayType, color: Color.SecondaryText } };
  }

  /**
   * Get the mount status accessor tag
   */
  getMountStatusAccessory(): { tag: { value: string; color: Color | string } } {
    const colors: Record<string, Color | string> = {
      Mounted: Color.Green,
      Unmounted: Color.Red,
      NOFS: NOFS_COLOR,
      Whole: Color.Purple,
      Container: Color.Blue,
      "Loading...": Color.SecondaryText,
    };

    const mountMap: Record<string, string> = {
      Mounted: "●",
      Unmounted: "○",
    };

    const color = colors[this.disk.mountStatus] || Color.Magenta;
    const mount = mountMap[this.disk.mountStatus] || this.disk.mountStatus;
    return { tag: { value: mount, color } };
  }

  /**
   * Get the size accessor tag with color-coded usage percentage
   */
  getSizeAccessory(type: "Full" | "Used" | "Free" | "UsedFree" = "Used"): {
    tag: { value: string; color: Color | string };
  } {
    // Show grey color while disk is still loading
    if (this.disk.mountStatus === "Loading...") {
      return { tag: { value: this.disk.size.sizeStr, color: Color.SecondaryText } };
    }

    const colors: Record<string, Color> = {
      90: Color.Red,
      75: Color.Orange,
      50: Color.Yellow,
      25: Color.Green,
      1: Color.Green,
      0: Color.Green,
    };

    if (this.disk.isWhole) {
      return { tag: { value: this.disk.size.sizeStr, color: Color.Purple } };
    }
    if (this.disk.mountStatus === "Container") {
      return { tag: { value: this.disk.size.sizeStr, color: Color.Blue } };
    }

    if (this.disk.mountStatus === "NOFS") {
      return { tag: { value: this.disk.size.sizeStr, color: NOFS_COLOR } };
    }

    if (this.disk.usedCapacity.sizeInt == 0) {
      return { tag: { value: this.disk.size.sizeStr, color: NO_CAPACITY_COLOR } };
    }

    // Fallback Magenta if used or free capacity is missing or 0
    if (!this.disk.usedCapacity.sizeInt || !this.disk.freeCapacity.sizeInt) {
      return { tag: { value: this.disk.size.sizeStr, color: Color.Magenta } };
    }

    const calculator = new DiskSizeCalculator(this.disk);
    const { utilizedPercentage, displayValue } = calculator.calculateSizeDisplay(type);

    const color =
      Object.entries(colors)
        .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
        .find(([threshold]) => utilizedPercentage >= parseInt(threshold))?.[1] || Color.Magenta;

    return {
      tag: {
        value: displayValue,
        color,
      },
    };
  }
}
