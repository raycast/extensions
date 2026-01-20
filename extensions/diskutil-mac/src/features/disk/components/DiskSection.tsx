import type Disk from "../../../models/Disk";
import DiskFactory from "../factories/DiskFactory";

export default class DiskSection {
  sectionName: string;
  disks: Disk[];

  constructor(sectionName: string) {
    this.sectionName = sectionName;
    this.disks = [];
  }

  /**
   * Initialize all disks in parallel using Promise.allSettled
   * Calls onDiskInitialized after each individual disk completes
   * This maintains parallel execution for performance
   */
  async initDisks(onDiskInitialized?: (disk: Disk) => void): Promise<void> {
    const initPromises = this.disks.map(async (disk) => {
      try {
        disk.startInit();
        await disk.init();
        disk.finishInit(true);
      } catch (error) {
        disk.finishInit(false);
        console.error(`Failed to initialize ${disk.identifier}:`, error);
      } finally {
        if (onDiskInitialized) {
          onDiskInitialized(disk);
        }
      }
    });

    await Promise.allSettled(initPromises);
  }

  /**
   * Create DiskSection from section string
   * Parses section name and disk strings, then creates Disk instances
   */
  static createFromString(sectionString: string): DiskSection {
    // Extract section name
    const sectionNameRegex = /(\/.+:)/gm;
    const sectionNameMatches = sectionString.match(sectionNameRegex);
    const sectionName = sectionNameMatches ? sectionNameMatches[0] : "";

    // Extract disk strings
    const diskRegex = /^ +\d:.+$/gm;
    const diskStrings = Array.from(sectionString.match(diskRegex) ?? []);

    // Create section and populate disks
    const section = new DiskSection(sectionName);
    section.disks = diskStrings
      .map((diskString) => DiskFactory.createDiskFromString(diskString))
      .filter(Boolean) as Disk[];

    return section;
  }
}

/**
 * Parse diskutil list output into DiskSection array
 * Creates sections synchronously, parallel init happens later
 */
export const parseDiskSections = (diskOutput: string): DiskSection[] => {
  const sectionRegex = /(\/.*?:.*?)(?=(?:\/|$))/gs;
  const sectionStrings = diskOutput.match(sectionRegex) ?? [];
  return sectionStrings.map(DiskSection.createFromString);
};
