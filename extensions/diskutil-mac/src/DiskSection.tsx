import Disk from "./Disk";

export default class DiskSection {
  sectionName: string;
  disks: Disk[];

  constructor(sectionName: string) {
    this.sectionName = sectionName;
    this.disks = [];
  }

  parseSectionDisks(sectionString: string) {
    const diskRegex = /^ +\d:.+$/gm;
    const diskStrings = sectionString.match(diskRegex) ?? [];
    const diskStringsArray = Array.from(diskStrings);

    this.disks = diskStringsArray.map(Disk.createFromString).filter(Boolean) as Disk[];
  }

  async initDisks(): Promise<void> {
    await Promise.all(this.disks.map((disk) => disk.init()));
  }

  static createFromString(sectionString: string): DiskSection {
    const sectionNameRegex = /(\/.+:)/gm;
    const sectionNameMatches = sectionString.match(sectionNameRegex);
    const sectionName = sectionNameMatches ? sectionNameMatches[0] : "";

    const diskSection = new DiskSection(sectionName);
    diskSection.parseSectionDisks(sectionString);

    return diskSection;
  }
}
