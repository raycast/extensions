import { Color, Detail } from "@raycast/api";

import { IShowData } from "../../interfaces/shows";
import { colorRotation } from "../../utils/colors";
import mappings from "./mappings";

export function showMetadata(show: IShowData) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title={mappings.createdAt(show).label} text={mappings.createdAt(show).value} />
      <Detail.Metadata.Label title={mappings.author(show).label} text={mappings.author(show).value} />
      <Detail.Metadata.Label title={mappings.description(show).label} text={mappings.description(show).value} />
      <Detail.Metadata.Label title={mappings.showType(show).label} text={mappings.showType(show).value} />
      <Detail.Metadata.Label title={mappings.visibility(show).label} text={mappings.visibility(show).value} />

      <Detail.Metadata.Separator />

      <Detail.Metadata.TagList title={mappings.categories(show).label}>
        <Detail.Metadata.TagList.Item
          text={mappings.categories(show).value!.category}
          color={mappings.categories(show).value!.category ? Color.PrimaryText : Color.SecondaryText}
        />
        {mappings.categories(show).value!.secondaryCategory && (
          <Detail.Metadata.TagList.Item
            text={mappings.categories(show).value!.secondaryCategory || ""}
            color={mappings.categories(show).value!.secondaryCategory ? Color.PrimaryText : Color.SecondaryText}
          />
        )}
      </Detail.Metadata.TagList>

      {mappings.keywords(show).value?.length === 0 && (
        <Detail.Metadata.TagList title={mappings.keywords(show).label}>
          {mappings
            .keywords(show)
            .value?.map((word) => <Detail.Metadata.TagList.Item text={word} color={colorRotation()} />)}
        </Detail.Metadata.TagList>
      )}

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label title="Links" />
      <Detail.Metadata.Link
        title={mappings.website(show).label}
        target={mappings.website(show).target || ""}
        text={mappings.website(show).value!}
      />
      <Detail.Metadata.Link
        title={mappings.rssFeed(show).label}
        target={mappings.rssFeed(show).target || ""}
        text={mappings.rssFeed(show).value!}
      />

      <Detail.Metadata.Separator />

      {mappings.podcastServices(show).length === 0 && (
        <>
          <Detail.Metadata.Label title="Available On" />
          {mappings.applePodcasts(show).value && (
            <Detail.Metadata.Link
              title={mappings.applePodcasts(show).label}
              target={mappings.applePodcasts(show).target || ""}
              text="Go to Link"
            />
          )}
          {mappings.googlePodcasts(show).value && (
            <Detail.Metadata.Link
              title={mappings.googlePodcasts(show).label}
              target={mappings.googlePodcasts(show).target || ""}
              text="Go to Link"
            />
          )}
          {mappings.amazonMusic(show).value && (
            <Detail.Metadata.Link
              title={mappings.amazonMusic(show).label}
              target={mappings.amazonMusic(show).target || ""}
              text="Go to Link"
            />
          )}
          {mappings.deezer(show).value && (
            <Detail.Metadata.Link
              title={mappings.deezer(show).label}
              target={mappings.deezer(show).target || ""}
              text="Go to Link"
            />
          )}
          {mappings.spotify(show).value && (
            <Detail.Metadata.Link
              title={mappings.spotify(show).label}
              target={mappings.spotify(show).target || ""}
              text="Go to Link"
            />
          )}
          {mappings.castro(show).value && (
            <Detail.Metadata.Link
              title={mappings.castro(show).label}
              target={mappings.castro(show).target || ""}
              text="Go to Link"
            />
          )}
          {mappings.pocketCasts(show).value && (
            <Detail.Metadata.Link
              title={mappings.pocketCasts(show).label}
              target={mappings.pocketCasts(show).target || ""}
              text="Go to Link"
            />
          )}
        </>
      )}
    </Detail.Metadata>
  );
}
