import { Action, ActionPanel, Detail, Keyboard, LaunchProps, Toast, popToRoot, showToast } from "@raycast/api";
import fetch from "node-fetch";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OpenGraph } from "./type";
import { parseOpenGraph } from "./util";

export default function Command({ arguments: { url } }: LaunchProps<{ arguments: { url: string } }>) {
  const [openGraph, setOpenGraph] = useState<OpenGraph | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fullUrl = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;

  useEffect(() => {
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

  const imageUrl = useCallback(
    (url: string) => {
      const img = url !== "none" ? url : null;
      if (img === null || img.startsWith("http")) return img;
      if (!img.startsWith("/")) return new URL(img, fullUrl).toString();
      const domain = new URL(fullUrl).origin;
      return `${domain}${img}`;
    },
    [fullUrl],
  );

  const ogImage = useMemo(() => {
    if (!openGraph) return null;
    return imageUrl(openGraph.og.image);
  }, [openGraph]);

  const twitterImage = useMemo(() => {
    if (!openGraph) return null;
    return imageUrl(openGraph.twitter.image);
  }, [openGraph]);

  if (!openGraph) return <Detail isLoading={isLoading} markdown="Loading..." />;

  const markdown = `
  ![](${ogImage})
  ## ${openGraph.title}
  ${openGraph.description}
  `;

  const ogKeys = Object.keys(openGraph.og) as (keyof typeof openGraph.og)[];
  const twitterKeys = Object.keys(openGraph.twitter) as (keyof typeof openGraph.twitter)[];

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
          {openGraph.og.image !== "none" && ogImage !== null ? (
            <Detail.Metadata.Link title="og:image" target={ogImage} text={openGraph.og.image as string} />
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
          {openGraph.twitter.image !== "none" && twitterImage !== null ? (
            <Detail.Metadata.Link
              title="twitter:image"
              target={twitterImage}
              text={openGraph.twitter.image as string}
            />
          ) : (
            <Detail.Metadata.Label title="twitter:image" text={openGraph.twitter.image} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Title" content={openGraph.title} />
            <Action.CopyToClipboard title="Copy Description" content={openGraph.description} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Open Graph">
            {ogKeys.map((key) =>
              openGraph.og[key] !== "none" ? (
                <Action.CopyToClipboard
                  key={key}
                  title={`Copy og:${key}`}
                  content={openGraph.og[key]}
                  shortcut={{ modifiers: ["cmd"], key: key[0] as Keyboard.KeyEquivalent }}
                />
              ) : null,
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Twitter">
            {twitterKeys.map((key) =>
              openGraph.twitter[key] !== "none" ? (
                <Action.CopyToClipboard
                  key={key}
                  title={`Copy twitter:${key}`}
                  content={openGraph.twitter[key]}
                  shortcut={{ modifiers: ["cmd", "shift"], key: key[0] as Keyboard.KeyEquivalent }}
                />
              ) : null,
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
