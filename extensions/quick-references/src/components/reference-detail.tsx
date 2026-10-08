import { Detail } from "@raycast/api";
import { ReferenceIndexItem } from "../types";
import { ReferenceActionPanel } from "./reference-actions";

interface ReferenceDetailProps {
  entry: ReferenceIndexItem;
  markdown: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onUpdate?: () => void;
}

export function ReferenceDetail({
  entry,
  markdown,
  isFavorite,
  onToggleFavorite,
  onUpdate,
}: ReferenceDetailProps) {
  return (
    <Detail
      navigationTitle={entry.title}
      markdown={markdown}
      actions={
        <ReferenceActionPanel
          entry={entry}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          onUpdate={onUpdate}
        />
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Category" text={entry.category} />
          <Detail.Metadata.TagList title="Tags">
            {entry.tags.map((tag) => (
              <Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Source" text={entry.path} />
          <Detail.Metadata.Link
            title="GitHub"
            text="Open file"
            target={entry.link}
          />
        </Detail.Metadata>
      }
    />
  );
}
