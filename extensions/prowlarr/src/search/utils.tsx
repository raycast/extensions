import { ReleaseResource } from "../prowlarrApi";
import { SearchFormValues, Sort } from "./types";

export function formatBytes(bytes: number) {
  const marker = 1024; // Change to 1000 if required
  const decimal = 1; // Change as required
  const kiloBytes = marker; // One Kilobyte is 1024 bytes
  const megaBytes = marker * marker; // One MB is 1024 KB
  const gigaBytes = marker * marker * marker; // One GB is 1024 MB

  // return bytes if less than a KB
  if (bytes < kiloBytes) return bytes + " Bytes";
  // return KB if less than a MB
  else if (bytes < megaBytes) return (bytes / kiloBytes).toFixed(decimal) + " KB";
  // return MB if less than a GB
  else if (bytes < gigaBytes) return (bytes / megaBytes).toFixed(decimal) + " MB";
  // return GB if less than a TB
  else return (bytes / gigaBytes).toFixed(decimal) + " GB";
}

export function getSearchResultSortPredicate(values: SearchFormValues) {
  switch (values.sort) {
    case Sort.SizeAsc:
      return (a: ReleaseResource, b: ReleaseResource) => (a.size ?? 0) - (b?.size ?? 0);
    case Sort.SizeDesc:
      return (a: ReleaseResource, b: ReleaseResource) => (b.size ?? 0) - (a?.size ?? 0);
    case Sort.SeedsAsc:
      return (a: ReleaseResource, b: ReleaseResource) => (a.seeders ?? 0) - (b?.seeders ?? 0);
    case Sort.SeedsDesc:
      return (a: ReleaseResource, b: ReleaseResource) => (b.seeders ?? 0) - (a?.seeders ?? 0);
    default:
      return () => 0;
  }
}
