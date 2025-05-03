import { List } from "@raycast/api";
import { GraphicPublication } from "@types";

interface Props {
  publication: GraphicPublication;
}

export default function ItemDetail({ publication }: Props) {
  const markdown = `
  ## ${publication.name} #${publication.volume}
  ![](${publication.frontImageUrl})`;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Publication Date" text={publication.publicationDate} />
          <List.Item.Detail.Metadata.Label title="Publisher" text={publication.editorial} />
          <List.Item.Detail.Metadata.Label title="Price" text={`$${publication.price}.00`} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
