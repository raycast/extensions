import { Detail, Icon } from "@raycast/api";
import { pathToFileURL } from "url";
import { convertDate, formatFileSize } from "$lib/utils";
import { buildFinderTagViews } from "$lib/pages/tag-browser/finder-tags";
import { resolveSymlink } from "$lib/symlink-resolve";
import type { ItemMetadataProps } from "./types";

export const ItemMetadata = ({ entry, tagCatalog = [] }: ItemMetadataProps) => {
  const resolved = entry.type === "symlink" ? resolveSymlink(entry.path) : null;
  const tagViews = buildFinderTagViews(entry.userTags, tagCatalog);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Name" text={entry.name} />
      <Detail.Metadata.Label title="Kind" text={entry.kind} />
      <Detail.Metadata.Label title="Type" text={entry.type} />
      {entry.type === "symlink" && (
        <>
          {resolved?.targetExists ? (
            <Detail.Metadata.Link
              title="Target"
              text={resolved.resolvedPath}
              target={pathToFileURL(resolved.resolvedPath).toString()}
            />
          ) : (
            <Detail.Metadata.Label title="Target" text="Broken link" icon={Icon.ExclamationMark} />
          )}
        </>
      )}
      <Detail.Metadata.Link title="Path" text={entry.path} target={pathToFileURL(entry.path).toString()} />
      <Detail.Metadata.Label title="Size" text={formatFileSize(entry.size)} />
      <Detail.Metadata.Label title="Content Type" text={entry.contentType} />
      {entry.fsInvisible && (
        <Detail.Metadata.TagList title="Attributes">
          <Detail.Metadata.TagList.Item text="Hidden" icon={Icon.EyeDisabled} />
        </Detail.Metadata.TagList>
      )}
      <Detail.Metadata.TagList title="Tags">
        {tagViews.map(({ name, color }, index) => (
          <Detail.Metadata.TagList.Item key={`${name}-${index}`} text={name} color={color} />
        ))}
      </Detail.Metadata.TagList>
      {entry.finderComment && <Detail.Metadata.Label title="Finder Comment" text={entry.finderComment} />}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Created" text={convertDate(entry.fsCreationDate).toLocaleString()} />
      <Detail.Metadata.Label title="Content Created" text={convertDate(entry.contentCreationDate).toLocaleString()} />
      <Detail.Metadata.Label title="Modified" text={convertDate(entry.contentModificationDate).toLocaleString()} />
      <Detail.Metadata.Label title="Content Changed" text={convertDate(entry.fsContentChangeDate).toLocaleString()} />
      <Detail.Metadata.Label title="Attribute Changed" text={convertDate(entry.attributeChangeDate).toLocaleString()} />
      {entry.lastUsedDate != null && (
        <Detail.Metadata.Label title="Last Used" text={convertDate(entry.lastUsedDate).toLocaleString()} />
      )}
    </Detail.Metadata>
  );
};
