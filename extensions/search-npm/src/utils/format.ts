export function formatDownloads(count: number) {
  return `${count}`.replace(/\B(?=(\d{3})+$)/g, ",");
}
