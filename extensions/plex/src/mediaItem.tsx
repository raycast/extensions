import { SectionItemsApiResponse } from "../types/types";
import { Detail } from "@raycast/api";
import calculateTime from "../utils/timeCalculator";
import thumbLinks from "../utils/thumbLinks";

export function MediaItem({ item }: { item: SectionItemsApiResponse["MediaContainer"]["Metadata"] }) {
  return (
    <Detail
      markdown={
        " # " +
          item.title +
          "\n\n ![](" +
          thumbLinks({ thumb: item.thumb }) +
          ") \n\n" +
          "## Summary \n\n" +
          item.summary || ""
      }
      navigationTitle={item.title || ""}
      metadata={
        <Detail.Metadata>
          {item.year && <Detail.Metadata.Label icon={"📅"} title="Year" text={item.year.toString() || ""} />}

          {item.rating && <Detail.Metadata.Label icon={"⭐"} title="Rating" text={item.rating.toString() || ""} />}

          {item.duration && (
            <Detail.Metadata.Label icon={"⌛"} title="Duration" text={calculateTime(item.duration) || ""} />
          )}

          {item.contentRating && (
            <Detail.Metadata.TagList title="Content Rating">
              <Detail.Metadata.TagList.Item text={item.contentRating || ""} color={"#eed535"} />
            </Detail.Metadata.TagList>
          )}

          {item.studio && <Detail.Metadata.Label icon={"🎥"} title="Studio" text={item.studio || ""} />}

          {item.title && (
            <Detail.Metadata.Link
              title="IMDB Link"
              target={"https://www.imdb.com/find/?q=" + item.title.toString()}
              text="IMDB"
            />
          )}
        </Detail.Metadata>
      }
    />
  );
}
