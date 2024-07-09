import { ReleaseResource } from "../prowlarrApi";
import { SearchFormValues, Sort } from "./types";

export function formatBytes(bytes: number, precision: number = 1): string {
  const units = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(precision)) + " " + units[i];
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
