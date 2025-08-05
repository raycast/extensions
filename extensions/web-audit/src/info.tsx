import { Action, ActionPanel, confirmAlert, Detail, Icon, LaunchProps, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";

interface Website {
  url: string;
}

export default function Command(props: LaunchProps<{ arguments: Website }>) {
  const { url } = props.arguments;
  const [result, setResult] = useState(null as unknown as Record<string, string>);
  const [sidebar, setSidebar] = useState(null as unknown as Record<string, string>);
  const [favicon, setFavicon] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();
  const [website, setWebsite] = useState<string | undefined>();
  const [ogImage, setOgImage] = useState<string | undefined>();
  const [loading, setLoading] = useState<boolean>(true);

  const getWebsiteInfo = (data: string) => {
    const title = data.match(/<title>(.*?)<\/title>/)?.[1];
    const description = data.match(/<meta name="description" content="(.*?)"\/>/)?.[1];
    const charset = data.match(/<meta\s+charset=["']?([a-zA-Z0-9-]+)["']?\s*\/?>/i)?.[1];
    const languageAttr = data.match(/<html lang="(.*?)">/)?.[1];
    const languageCode = languageAttr?.substring(0, 2);
    const author =
      data.match(/<meta name="author" content="(.*?)"\/>/)?.[1] ||
      data.match(/<meta\s+property=["']twitter:site["']\s+content=["']@([a-zA-Z0-9_]+)["']\s*\/?>/i)?.[1];

    const ogImageURL = data.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']\s*\/?>/i)?.[1];
    if (ogImageURL) setOgImage(ogImageURL);

    if (title) setSidebar((sidebar) => ({ ...sidebar, title: title }));
    if (description) setSidebar((sidebar) => ({ ...sidebar, description: description }));
    if (charset) setSidebar((sidebar) => ({ ...sidebar, charset: charset }));
    if (languageCode) setSidebar((sidebar) => ({ ...sidebar, language: languageCode }));
    if (author) setSidebar((sidebar) => ({ ...sidebar, author: author }));
  };

  const websiteCount = (data: string) => {
    const hTags = data.match(/<h[1-6]>(.*?)<\/h[1-6]>/g);
    const pTags = data.match(/<p>(.*?)<\/p>/g);
    const aTags = data.match(/<a(.*?)<\/a>/g);
    const imgTags = data.match(/<img(.*?)>/g);
    const scriptTags = data.match(/<script(.*?)<\/script>/g);

    if (hTags) setResult((result) => ({ ...result, hTags: String(hTags.length) }));
    if (pTags) setResult((result) => ({ ...result, pTags: String(pTags.length) }));
    if (aTags) setResult((result) => ({ ...result, aTags: String(aTags.length) }));
    if (imgTags) setResult((result) => ({ ...result, imgTags: String(imgTags.length) }));
    if (scriptTags) setResult((result) => ({ ...result, scriptTags: String(scriptTags.length) }));
  };

  const websiteInfo = async (url: string) => {
    const response = await fetch(url);
    const data = await response.text();

    const icon = `https://www.google.com/s2/favicons?domain=${url}`;
    setFavicon(icon);

    websiteCount(data);

    getWebsiteInfo(data);
  };

  const dropUrlErrorIfNeeded = () => {
    if (urlError) setUrlError(undefined);
  };

  const validateUrl = (url: string) => {
    const pattern = new RegExp(
      "^(https?:\\/\\/)?" +
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" +
        "((\\d{1,3}\\.){3}\\d{1,3}))" +
        "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" +
        "(\\?[;&a-z\\d%_.~+=-]*)?" +
        "(\\#[-a-z\\d_]*)?$",
      "i",
    );

    return !!pattern.test(url);
  };

  const urlReachable = async (url: string) => {
    try {
      const response = await fetch(url);
      return response.status === 200;
    } catch {
      return false;
    }
  };

  const submitForm = async (values: Record<string, string>) => {
    if (values.url) {
      if (validateUrl(values.url) && (await urlReachable(values.url))) {
        await websiteInfo(String(values.url));
        setWebsite(values.url);
        setLoading(false);
      } else {
        confirmAlert({
          icon: Icon.ExclamationMark,
          title: "URL is not valid",
          message: "Please enter a valid URL including the protocol (http:// or https://).",
          primaryAction: {
            title: "Try another",
            onAction: () => {
              dropUrlErrorIfNeeded();
              popToRoot({
                clearSearchBar: false,
              });
            },
          },
          dismissAction: {
            title: "Cancel",
            onAction: () => {
              dropUrlErrorIfNeeded();
              popToRoot({
                clearSearchBar: true,
              });
            },
          },
        });

        setUrlError("Invalid URL");
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (url) submitForm({ url: url });
  }, []);

  return (
    <>
      {loading && <Detail isLoading={true} navigationTitle="Getting data..." />}
      {result && !loading && (
        <Detail
          navigationTitle={`Scraped ${website}`}
          markdown={
            ((favicon && `# ![${website}](${favicon}) `) || "#") +
            ` Website OG Image: \n` +
            (ogImage ? `![${website}](${ogImage})` : "No OG Image found") +
            `\n\n## Website Info \n` +
            (result.hTags ? `* **h-Tags:** ${result.hTags} \n` : `\n`) +
            (result.pTags ? `* **p-Tags:** ${result.pTags} \n` : `\n`) +
            (result.aTags ? `* **a-Tags:** ${result.aTags} \n` : `\n`) +
            (result.imgTags ? `* **img-Tags:** ${result.imgTags} \n` : `\n`) +
            (result.scriptTags ? `* **script-Tags:** ${result.scriptTags} \n` : `\n`)
          }
          metadata={
            <Detail.Metadata>
              {sidebar.title && <Detail.Metadata.Label title="Page Title" text={sidebar.title} />}
              {sidebar.description && <Detail.Metadata.Label title="Description" text={sidebar.description} />}
              {(sidebar.charset || sidebar.language) && (
                <Detail.Metadata.TagList title="Page Info">
                  {sidebar.charset && (
                    <Detail.Metadata.TagList.Item text={sidebar.charset} color="#22c55e"></Detail.Metadata.TagList.Item>
                  )}
                  {sidebar.language && (
                    <Detail.Metadata.TagList.Item
                      text={sidebar.language}
                      color="#22c55e"
                    ></Detail.Metadata.TagList.Item>
                  )}
                </Detail.Metadata.TagList>
              )}
              {sidebar.author && <Detail.Metadata.Separator />}
              {sidebar.author && <Detail.Metadata.Link title="Source" target={String(website)} text={sidebar.author} />}
            </Detail.Metadata>
          }
          actions={
            website && (
              <ActionPanel>
                <Action.OpenInBrowser url={website} title="Open Site" />
                <Action
                  title="Scrape Another Site"
                  onAction={() => {
                    setResult(null as unknown as Record<string, string>);
                    setWebsite("");
                    setSidebar(null as unknown as Record<string, string>);
                    setOgImage("");

                    popToRoot({
                      clearSearchBar: false,
                    });
                  }}
                  icon={Icon.Repeat}
                />
                {sidebar.title && (
                  <Action.CopyToClipboard
                    title="Copy Page Title"
                    content={sidebar.title}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  />
                )}
                {sidebar.description && (
                  <Action.CopyToClipboard
                    title="Copy Page Description"
                    content={sidebar.description}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  />
                )}
              </ActionPanel>
            )
          }
        />
      )}
    </>
  );
}
