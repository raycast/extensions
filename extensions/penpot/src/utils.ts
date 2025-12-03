export function iconAssetUri(thumbnailId: string) {
  const endpoint = "https://design.penpot.app/";
  return `${endpoint}assets/by-id/${thumbnailId}`;
}
