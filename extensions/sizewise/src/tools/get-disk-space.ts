import { mountedVolumes } from "../sizewise";
import { DiskSpace, diskSpace } from "../volumes";

/**
 * Lists the disks mounted on this Mac, startup disk first, with each disk's size, the space
 * available for new files (counting purgeable space, as Finder does), and the percentage in use.
 */
export default async function tool(): Promise<DiskSpace[]> {
  return (await mountedVolumes()).map(diskSpace);
}
