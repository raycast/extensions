import { ReleaseResource } from "../../prowlarrApi";
import { SearchFormValues, Sort } from "../types";

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
