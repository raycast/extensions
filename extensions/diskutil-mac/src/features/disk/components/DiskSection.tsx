import type Disk from "../../../models/Disk";
import DiskFactory from "../factories/DiskFactory";
import { Semaphore } from "../../../utils/semaphore";

// Process-wide cap on concurrent disk.init() calls (each runs two diskutil execs).
const diskInitSemaphore = new Semaphore(16);

export default class DiskSection {
  sectionName: string;
  disks: Disk[];

  constructor(sectionName: string) {
    this.sectionName = sectionName;
    this.disks = [];
  }

  async initDisks(onDiskInitialized?: (disk: Disk) => void): Promise<void> {
    const initPromises = this.disks.map(async (disk) => {
      const release = await diskInitSemaphore.acquire();
      try {
        disk.startInit();
        await disk.init();
        disk.finishInit(true);
      } catch (error) {
        disk.finishInit(false);
        console.error(`Failed to initialize ${disk.identifier}:`, error);
      } finally {
        release();
        if (onDiskInitialized) {
          onDiskInitialized(disk);
        }
      }
    });

    await Promise.allSettled(initPromises);
  }

  static createFromString(sectionString: string): DiskSection {
    const sectionNameMatches = sectionString.match(/(\/.+:)/gm);
    const sectionName = sectionNameMatches ? sectionNameMatches[0] : "";

    const diskStrings = Array.from(sectionString.match(/^ +\d:.+$/gm) ?? []);

    const section = new DiskSection(sectionName);
    section.disks = diskStrings
      .map((diskString) => DiskFactory.createDiskFromString(diskString))
      .filter(Boolean) as Disk[];

    return section;
  }
}

export const parseDiskSections = (diskOutput: string): DiskSection[] => {
  const sectionRegex = /(\/.*?:.*?)(?=(?:\/|$))/gs;
  const sectionStrings = diskOutput.match(sectionRegex) ?? [];
  return sectionStrings.map(DiskSection.createFromString);
};
