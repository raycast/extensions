import { Detail } from "@raycast/api";
import { OpenGraph } from "./type";

interface OpenGraphDetailProps {
  openGraph: OpenGraph | undefined;
}

export default function OpenGraphDetail({ openGraph }: OpenGraphDetailProps) {
  const markdown = `
  ![](${openGraph?.og.image})
  ## ${openGraph?.title}
  ${openGraph?.description}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={openGraph?.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="title" text={openGraph?.title} />
          <Detail.Metadata.Label title="description" text={openGraph?.description} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="og:title" text={openGraph?.og.title} />
          <Detail.Metadata.Label title="og:description" text={openGraph?.og.description} />
          {openGraph?.og.image !== "none" ? (
            <Detail.Metadata.Link
              title="og:image"
              target={openGraph?.og.image as string}
              text={openGraph?.og.image as string}
            />
          ) : (
            <Detail.Metadata.Label title="og:image" text={openGraph?.og.image} />
          )}
          {openGraph?.og.url !== "none" ? (
            <Detail.Metadata.Link
              title="og:url"
              target={openGraph?.og.url as string}
              text={openGraph?.og.url as string}
            />
          ) : (
            <Detail.Metadata.Label title="og:url" text={openGraph?.og.url} />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="twitter:title" text={openGraph?.twitter.title} />
          <Detail.Metadata.Label title="twitter:description" text={openGraph?.twitter.description} />
          <Detail.Metadata.Label title="twitter:card" text={openGraph?.twitter.card} />
          <Detail.Metadata.Link
            title="twitter:image"
            target={openGraph?.twitter.image as string}
            text={openGraph?.twitter.image as string}
          />
        </Detail.Metadata>
      }
    />
  );
}
