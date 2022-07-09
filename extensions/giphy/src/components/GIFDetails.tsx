import { Detail } from "@raycast/api";
import fileSize from "filesize";
import moment from "moment";
import { gifToMd, normalizeTitle } from "../utils/giphy";
import { IGif } from "@giphy/js-types";
import GIFActions from "./GIFActions";
import { useEffect } from "react";
import { ViewHandle } from "../hooks/useGiphy";

export type GIFDetailsProps = {
  gif: IGif;
  onView?: ViewHandle;
};

function GIFDetails({ gif, onView }: GIFDetailsProps) {
  useEffect(() => {
    if (onView) onView(gif);
  }, [gif]);

  return (
    <Detail
      markdown={gifToMd(gif.images.original.url, gif.title)}
      navigationTitle={normalizeTitle(gif.title)}
      actions={<GIFActions gif={gif} details={true} />}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={normalizeTitle(gif.title)} />
          <Detail.Metadata.Label title="Width" text={`${gif.images.original.width} px`} />
          <Detail.Metadata.Label title="Height" text={`${gif.images.original.height} px`} />
          <Detail.Metadata.Label title="Size" text={fileSize(Number(gif.images.original.size))} />
          <Detail.Metadata.Label title="Created" text={moment(gif.import_datetime, "DD-MM-YYYY").fromNow()} />
          <Detail.Metadata.Label
            title="User"
            text={gif.username}
            {...(gif.user?.avatar_url && { icon: { source: gif.user?.avatar_url } })}
          />

          <Detail.Metadata.TagList title="Rating">
            <Detail.Metadata.TagList.Item
              text={gif.rating}
              color={
                gif.rating === "g"
                  ? "#28C76F"
                  : gif.rating === "pg"
                  ? "#FFCB13"
                  : gif.rating === "pg-13"
                  ? "#FFA113"
                  : gif.rating === "r"
                  ? "#FF132F"
                  : "#28C76F"
              }
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Links" target={gif.url} text="Giphy Link" />
          <Detail.Metadata.Link title="" target={gif.source} text="Source" />
        </Detail.Metadata>
      }
    />
  );
}

export default GIFDetails;
