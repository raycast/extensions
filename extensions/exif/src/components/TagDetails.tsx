import type { Tags } from "exifreader";
import { memo } from "react";

import { Detail } from "@raycast/api";

export const TagDetails = memo(({ fileName, tags }: { fileName: string; tags: Tags }) => {
  const tagsArray: [string, string, string][] = Object.entries(tags)
    .filter(([key]) => !["Thumbnail", "Images"].includes(key) && !key.startsWith("undefined-"))
    .sort(([key1], [key2]) => key1.localeCompare(key2))
    .map(([k, value], index, array) => {
      const key = k.trim();
      const keyVal = array.findIndex(([k]) => k.trim() === key) === index ? key : `${key}-${index}`;
      if (["ApplicationNotes", "MakerNote"].includes(key)) {
        return [keyVal, key, "..."];
      }
      if (value === undefined) {
        return [keyVal, key, "(unknown)"];
      }
      if (value instanceof Array) {
        return [keyVal, key, value.map((v) => v.description).join(", ")];
      }
      if (value instanceof Date) {
        return [keyVal, key, value.toISOString()];
      }
      return [keyVal, key, value.description];
    });

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="File" text={decodeURIComponent(fileName)} />
      <Detail.Metadata.Separator />
      {tagsArray.map(([keyVal, key, value]) => (
        <Detail.Metadata.Label key={keyVal} title={key} text={value} />
      ))}
    </Detail.Metadata>
  );
});
