import { Icon, Image, List } from "@raycast/api";

interface PostDetailMetadataProps {
  author?: { name: string; avatar_urls?: Record<string, string> };
  primaryCat?: { name: string };
  dateStr: string;
  link: string;
}

export function PostDetailMetadata({
  author,
  primaryCat,
  dateStr,
  link,
}: PostDetailMetadataProps) {
  return (
    <List.Item.Detail.Metadata>
      {author && (
        <List.Item.Detail.Metadata.Label
          title="Autor"
          text={author.name}
          icon={{
            source:
              author.avatar_urls?.["48"] ??
              author.avatar_urls?.["96"] ??
              Icon.Person,
            mask: Image.Mask.Circle,
          }}
        />
      )}
      {primaryCat && (
        <List.Item.Detail.Metadata.Label
          title="Kategoria"
          text={primaryCat.name}
        />
      )}
      <List.Item.Detail.Metadata.Label title="Data" text={dateStr} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Link
        title="Otwórz"
        text="Dailyweb.pl"
        target={link}
      />
    </List.Item.Detail.Metadata>
  );
}
