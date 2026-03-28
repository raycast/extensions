export type InstalledPack = {
  name: string;
  displayName: string;
};

export function getInstalledPacks(_packsDir: string): InstalledPack[] {
  throw new Error("Not implemented");
}
