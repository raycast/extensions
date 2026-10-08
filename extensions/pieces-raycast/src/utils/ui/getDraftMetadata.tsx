import { Detail, open } from "@raycast/api";
import { BrowserAsset } from "../../controllers/BrowserController";
import { ClipboardAsset } from "../../controllers/ClipboardController";
import classificationSpecificToReadable from "../converters/classificationSpecificToReadable";
import getIcon from "./getDraftIcon";
import { StrippedAsset } from "../../types/strippedAsset";

export default function getDraftMetadata(
  item: ClipboardAsset | BrowserAsset | StrippedAsset,
) {
  const metadataChildren: JSX.Element[] = [];

  // classification, each item should have a classification besides directories...
  metadataChildren.push(
    <Detail.Metadata.Label
      title="Classification"
      icon={getIcon(item)}
      text={item.ext ? classificationSpecificToReadable(item.ext) : "Unknown"}
    />,
  );

  // the item has some tags from /draft
  if (item.tags?.length) {
    metadataChildren.push(
      <Detail.Metadata.TagList title="Tags">
        {item.tags.slice(0, 3).map((el) => (
          <Detail.Metadata.TagList.Item key={el.text} text={el.text} />
        ))}
      </Detail.Metadata.TagList>,
    );
  }

  // item has some websites from /draft
  if (item.websites?.length) {
    metadataChildren.push(
      <Detail.Metadata.TagList title="Websites">
        {item.websites.slice(0, 3).map((el) => (
          <Detail.Metadata.TagList.Item
            key={el.url}
            text={el.url}
            onAction={() => open(el.url)}
          />
        ))}
      </Detail.Metadata.TagList>,
    );
  }

  return metadataChildren;
}
