import { listObjects } from "../api";
import { getTagQueryPrefix } from "../tag-query";
import { isUserTag } from "../tag-utils";
import { Tag } from "../types";
import { ObjectList } from "./ObjectList";

export function TagObjectList(props: { tag: Tag }) {
  const tagPrefix = getTagQueryPrefix(props.tag.name);
  const tagLabel = props.tag.name;

  return (
    <ObjectList
      datasetKey={`tag:${tagLabel}`}
      hiddenAccessoryTagNames={[tagLabel]}
      searchBarPlaceholder={`Search in ${tagLabel}…`}
      emptyTitle="No Matching Items"
      emptyDescription="Try a different search, use mymind syntax, or switch the type filter."
      loadObjects={({ query }) =>
        listObjects({
          q: query ? `${tagPrefix} && ${query}` : tagPrefix,
        })
      }
    />
  );
}

export function shouldIncludeTagInBrowser(tag: Tag): boolean {
  return isUserTag(tag);
}
