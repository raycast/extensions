import { Fragment } from "react";
import { Image } from "../types";
import { Icon, List } from "@raycast/api";

export default function ImagesMetadata({ images }: { images: Image[] }) {
  return (
    <>
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Images" />
      {images.map((image, imageIndex) => (
        <Fragment key={imageIndex}>
          <List.Item.Detail.Metadata.Link title="Original" text={image.original} target={image.original} />
          <List.Item.Detail.Metadata.Link title="Thumb" text={image.thumb} target={image.original} />
          <List.Item.Detail.Metadata.Label
            title="Caption"
            text={image.caption || ""}
            icon={image.caption ? undefined : Icon.Minus}
          />
          <List.Item.Detail.Metadata.Link title="Large" text={image.large} target={image.original} />
          <List.Item.Detail.Metadata.Separator />
        </Fragment>
      ))}
    </>
  );
}
