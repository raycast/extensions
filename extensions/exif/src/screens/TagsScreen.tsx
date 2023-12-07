import type { Tags } from "exifreader";
import { type FC, useEffect, useMemo } from "react";

import { Action, ActionPanel, Detail, Toast, showToast, useNavigation } from "@raycast/api";

import { tagsToMarkdownTable } from "@/utils/exif";

import RawDataScreen from "./RawData";

interface TagsScreenProps {
  file: string;
  tags: Tags;
}

const TagsScreen: FC<TagsScreenProps> = ({ tags }) => {
  const { push } = useNavigation();
  const tagsString = useMemo(() => JSON.stringify(tags, null, 2), [tags]);
  const tagsTable = useMemo(() => tagsToMarkdownTable(tags), [tags]);
  const possibleLocation = useMemo(() => {
    if (tags.GPSLatitude && tags.GPSLongitude) {
      return [
        "## GPS",
        "> This image has GPS coordinates, click the link below to open in Google Maps.\n",
        `[Open in Google Maps](https://www.google.com/maps/search/?api=1&query=${tags.GPSLatitude.description},${tags.GPSLongitude.description})`,
      ].join("\n");
    }
    return "";
  }, [tags]);
  const possibleThumbnail = useMemo(() => {
    if (tags.Thumbnail?.base64) {
      return ["## Thumbnail", `<img height="150" src="data:image/jpeg;base64,${tags.Thumbnail.base64}" />`].join("\n");
    }
    return "";
  }, [tags]);

  useEffect(() => {
    showToast({ style: Toast.Style.Success, title: "Tags", message: "Tags loaded" });
  }, []);

  return (
    <Detail
      navigationTitle="Exif Tags"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy JSON" content={tagsString} />
          {tagsString.length < 10000 ? (
            <Action title="View Raw Tags" onAction={() => push(<RawDataScreen tags={tags} />)} />
          ) : null}
        </ActionPanel>
      }
      markdown={[possibleThumbnail, possibleLocation, "## Tags", tagsTable].join("\n")}
    />
  );
};

export default TagsScreen;
