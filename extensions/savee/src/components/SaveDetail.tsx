import { Detail } from "@raycast/api";
import { formatDimensions, formatSavedBy, getSaveTitle, getSourceHost } from "../save-utils";
import { Save } from "../types";
import { SaveActions } from "./SaveActions";

function getMarkdown(save: Save): string {
  const title = getSaveTitle(save).replace(/[[\]]/g, "");
  const image = save.media.type === "video" ? save.media.thumbnail : save.media.original;
  const parts = ["![" + title + "](" + image + "?raycast-height=360)"];

  if (save.media.type === "video") {
    parts.push("_Video. Open in Savee to play it._");
  }

  if (save.detected_aesthetics) {
    parts.push(save.detected_aesthetics);
  }

  return parts.join("\n\n");
}

export function SaveDetail({ save }: { save: Save }) {
  const host = getSourceHost(save.source_url);

  return (
    <Detail
      navigationTitle={getSaveTitle(save)}
      markdown={getMarkdown(save)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={getSaveTitle(save)} />
          {save.source_url ? (
            <Detail.Metadata.Link title="Source" text={host ?? save.source_url} target={save.source_url} />
          ) : (
            <Detail.Metadata.Label title="Source" text="Unknown" />
          )}
          <Detail.Metadata.Link title="Savee" text={"savee.com/i/" + save.short_id} target={save.url} />
          {save.user ? (
            <Detail.Metadata.Link title="Saved By" text={save.user.name || save.user.username} target={save.user.url} />
          ) : null}
          <Detail.Metadata.Separator />
          {save.colors.length > 0 ? (
            <Detail.Metadata.TagList title="Colors">
              {save.colors.slice(0, 6).map(({ color }) => (
                <Detail.Metadata.TagList.Item key={color} text={color} color={color} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          <Detail.Metadata.Label title="Type" text={save.media.type === "video" ? "Video" : "Image"} />
          <Detail.Metadata.Label title="Dimensions" text={formatDimensions(save)} />
          <Detail.Metadata.Label
            title="Saved"
            text={new Date(save.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
          />
          <Detail.Metadata.Label title="Saved On Savee By" text={formatSavedBy(save.total_saves)} />
          {save.is_private ? <Detail.Metadata.Label title="Visibility" text="Private" /> : null}
        </Detail.Metadata>
      }
      actions={<SaveActions save={save} isDetail />}
    />
  );
}
