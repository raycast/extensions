import { Icon, List } from "@raycast/api";
import { ArtCrime, WantedPerson } from "./types";

export function ItemWithTextOrIcon({ title, text: item }: { title: string; text: string | null | undefined }) {
  const text = item || undefined;
  const icon = item ? undefined : Icon.Minus;
  return <List.Item.Detail.Metadata.Label title={title} text={text} icon={icon} />;
}

export function ItemWithTagsOrIcon({ title, items }: { title: string; items: string[] | undefined }) {
  return items ? (
    <List.Item.Detail.Metadata.TagList title={title}>
      {items.map((item) => (
        <List.Item.Detail.Metadata.TagList.Item key={item} text={item} />
      ))}
    </List.Item.Detail.Metadata.TagList>
  ) : (
    <List.Item.Detail.Metadata.Label title={title} icon={Icon.Minus} />
  );
}

export function generateMarkdown(artcrime: ArtCrime | WantedPerson) {
  let img = "";
  if (artcrime.images.length) {
    const image = artcrime.images[0];
    const alt = image.caption || artcrime.title;
    const src = image.thumb || image.original || image.large;
    img = `![${alt}](${src})`;
  }
  return img + `\n\n ${artcrime.description}`;
}
