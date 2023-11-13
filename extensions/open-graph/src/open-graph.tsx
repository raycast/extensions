import { Detail, LaunchProps, Toast, popToRoot, showToast } from "@raycast/api";
import fetch from "node-fetch";
import { useEffect, useState } from "react";
import { OpenGraph } from "./type";
import { parseOpenGraph } from "./util";

export default function Command(props: LaunchProps<{ arguments: Arguments.OpenGraph }>) {
  const { url } = props.arguments;
  const [openGraph, setOpenGraph] = useState<OpenGraph | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fullUrl = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;

    async function fetchData() {
      setIsLoading(true);
      try {
        const res = await fetch(fullUrl);

        if (res.ok) {
          const text = await res.text();
          const openGraph = parseOpenGraph(text);
          setOpenGraph(openGraph);
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Loading Failed",
            message: `Error ${res.status}: Check the URL and try again.`,
          });
          popToRoot();
          return;
        }
      } catch (error: unknown) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Can't get open graph information",
          message: "Please check the url and try again.",
        });
        popToRoot();
        return;
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (!openGraph) return <Detail isLoading={isLoading} markdown="Loading..." />;

  const markdown = `
  ![](${openGraph.og.image})
  ## ${openGraph.title}
  ${openGraph.description}
  `;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="title" text={openGraph.title} />
          <Detail.Metadata.Label title="description" text={openGraph.description} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="og:title" text={openGraph.og.title} />
          <Detail.Metadata.Label title="og:description" text={openGraph.og.description} />
          {openGraph.og.image !== "none" ? (
            <Detail.Metadata.Link
              title="og:image"
              target={openGraph.og.image as string}
              text={openGraph.og.image as string}
            />
          ) : (
            <Detail.Metadata.Label title="og:image" text={openGraph.og.image} />
          )}
          {openGraph.og.url !== "none" ? (
            <Detail.Metadata.Link
              title="og:url"
              target={openGraph.og.url as string}
              text={openGraph.og.url as string}
            />
          ) : (
            <Detail.Metadata.Label title="og:url" text={openGraph.og.url} />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="twitter:title" text={openGraph.twitter.title} />
          <Detail.Metadata.Label title="twitter:description" text={openGraph.twitter.description} />
          <Detail.Metadata.Label title="twitter:card" text={openGraph.twitter.card} />
          {openGraph.twitter.image !== "none" ? (
            <Detail.Metadata.Link
              title="twitter:image"
              target={openGraph.twitter.image as string}
              text={openGraph.twitter.image as string}
            />
          ) : (
            <Detail.Metadata.Label title="twitter:image" text={openGraph.twitter.image} />
          )}
        </Detail.Metadata>
      }
    />
  );
}
