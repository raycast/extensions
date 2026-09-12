import Disk from "../../../models/Disk";
import { DiskParser } from "../parser/DiskParser";

/**
 * Factory for creating Disk instances.
 */
export default class DiskFactory {
  /**
   * Create a Disk instance from parsed data
   */
  static createDisk(number: number, type: string, identifier: string, name: string, size: string): Disk {
    return new Disk(number, type, identifier, name, size);
  }

  /**
   * Parse diskutil list line and create Disk instance
   * Format: "   0: Apple_APFS_ISC ⁨⁩                    EFI ⁨⁩                    524.3 MB   disk3s1"
   */
  static createDiskFromString(diskString: string): Disk | null {
    const data = DiskParser.parseStringToData(diskString);

    if (!data) {
      return null;
    }

    return this.createDisk(data.number, data.type, data.identifier, data.name, data.size);
  }
}
