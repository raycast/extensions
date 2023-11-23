import { Detail } from "@raycast/api";
import { Manga } from "../types";

interface Props {
  manga: Manga;
}

export default function ({ manga }: Props) {
  const markdown = `
  ## ${manga.name} #${manga.volume}
  ![](${manga.frontImageUrl})`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${manga.name} #${manga.volume}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Publication Date" text={manga.publicationDate} />
          <Detail.Metadata.Label title="Publisher" text={manga.editorial} />
          <Detail.Metadata.Label title="Price" text={`$${manga.price}.00`} />
        </Detail.Metadata>
      }
    />
  );
}
