import { Action, ActionPanel, confirmAlert, Detail, Icon, LaunchProps, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";

interface Website {
  url: string;
}

export default function Command(props: LaunchProps<{ arguments: Website }>) {
  const { url } = props.arguments;
  const [tips, setTips] = useState<boolean>(false);
  const [result, setResult] = useState(null as unknown as Record<string, string>);
  const [sidebar, setSidebar] = useState(null as unknown as Record<string, string>);
  const [favicon, setFavicon] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();
  const [website, setWebsite] = useState<string | undefined>();
  const [score, setScore] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const checkHTags = (data: string) => {
    const h1 = data.match(/<h1/g)?.length || 0;
    const h2 = data.match(/<h2/g)?.length || 0;
    const h3 = data.match(/<h3/g)?.length || 0;

    if (h1 <= h2 && h2 <= h3) {
      setScore((score) => score + 1);
      setResult((result) => ({ ...result, hTags: `Headings are in order ![](${Icon.CheckCircle}) ` }));
    } else {
      setResult((result) => ({ ...result, hTags: `Headings are not in order ![](${Icon.XMarkCircle})` }));
    }
  };

  const checkImageAlt = (data: string) => {
    const images = data.match(/<img/g)?.length || 0;
    const altImages = data.match(/alt=/g)?.length || 0;

    if (images === altImages) {
      setScore((score) => score + 1);
      setResult((result) => ({ ...result, imageAlt: `All images have alt tags ![](${Icon.CheckCircle})` }));
    } else {
      setResult((result) => ({ ...result, imageAlt: `Not all images have alt tags ![](${Icon.XMarkCircle})` }));
    }
  };

  const checkMeta = (data: string) => {
    const meta = data.match(/<meta/g)?.length || 0;

    if (meta > 5) {
      setScore((score) => score + 1);
      setResult((result) => ({ ...result, meta: `Meta tags are correct ![](${Icon.CheckCircle})` }));
    } else {
      setResult((result) => ({ ...result, meta: `Some meta tags are not correct ![](${Icon.XMarkCircle})` }));
    }
  };

  const getFavicon = (url: string) => {
    const icon = `https://www.google.com/s2/favicons?domain=${url}`;
    setFavicon(icon);
  };

  const getWebsiteInfo = (data: string) => {
    const title = data.match(/<title>(.*?)<\/title>/)?.[1];
    const description = data.match(/<meta name="description" content="(.*?)"\/>/)?.[1];
    const charset = data.match(/<meta\s+charset=["']?([a-zA-Z0-9-]+)["']?\s*\/?>/i)?.[1];
    const languageAttr = data.match(/<html lang="(.*?)">/)?.[1];
    const languageCode = languageAttr?.substring(0, 2);
    const author =
      data.match(/<meta name="author" content="(.*?)"\/>/)?.[1] ||
      data.match(/<meta\s+property=["']twitter:site["']\s+content=["']@([a-zA-Z0-9_]+)["']\s*\/?>/i)?.[1];

    if (title) setSidebar((sidebar) => ({ ...sidebar, title: title }));
    if (description) setSidebar((sidebar) => ({ ...sidebar, description: description }));
    if (charset) setSidebar((sidebar) => ({ ...sidebar, charset: charset }));
    if (languageCode) setSidebar((sidebar) => ({ ...sidebar, language: languageCode }));
    if (author) setSidebar((sidebar) => ({ ...sidebar, author: author }));
  };

  const checkIndexed = (data: string) => {
    const metaRobots = data.match(/<meta name="robots" content="(.*?)"\/>/)?.[1];
    if (metaRobots) {
      if (metaRobots.includes("noindex")) {
        setResult((result) => ({ ...result, indexed: `The website is not indexed ![](${Icon.XMarkCircle})` }));
      } else {
        setScore((score) => score + 1);
        setResult((result) => ({ ...result, indexed: `The website is indexed ![](${Icon.CheckCircle})` }));
      }
    } else {
      setScore((score) => score + 1);
      setResult((result) => ({ ...result, indexed: `The website is indexed ![](${Icon.CheckCircle})` }));
    }
  };

  const websiteCheck = async (url: string) => {
    const start = Date.now();
    const response = await fetch(url);
    const data = await response.text();
    const end = Date.now();

    const robots = await fetch(`${url}/robots.txt`);
    if (robots.status === 404) {
      setResult((result) => ({ ...result, robots: `Robots.txt was not found ![](${Icon.XMarkCircle})` }));
    } else {
      const robotsData = await robots.text();
      if (robotsData.includes("Disallow: /")) {
        setResult((result) => ({ ...result, robots: `Robots.txt is not correct ![](${Icon.XMarkCircle})` }));
      } else {
        setScore((score) => score + 1);
        setResult((result) => ({ ...result, robots: `Robots.txt is correct ![](${Icon.CheckCircle})` }));
      }
    }

    getFavicon(url);
    checkHTags(data);
    checkImageAlt(data);
    checkMeta(data);
    checkIndexed(data);

    if (end - start > 700) {
      setResult((result) => ({
        ...result,
        pageSpeed: `The website is slow (${end - start}ms) ![](${Icon.XMarkCircle})`,
      }));
    } else {
      setScore((score) => score + 1);
      setResult((result) => ({
        ...result,
        pageSpeed: `The website is fast (${end - start}ms) ![](${Icon.CheckCircle})`,
      }));
    }
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
        await websiteCheck(String(values.url));
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
      {loading && <Detail isLoading={true} navigationTitle="Analyzing..." />}
      {result && !loading && (
        <Detail
          navigationTitle={`Analyzed ${website}`}
          markdown={
            ((favicon && `# ![${website}](${favicon}) `) || "#") +
            ` SEO Score: ${Math.round((score / 6) * 100)}% \n` +
            `## Results in detail: \n` +
            `- ${result.hTags} \n ` +
            `${
              tips && result.hTags.includes("not")
                ? "\n The hierarchy of your h-Tags should be reviewed. You can have multiple h1-Tags, however make sure to not overuse them, for example try to have more h2-Tags than h1-Tags and more h3-Tags than h2-Tags and so on. \n \n"
                : ""
            }` +
            `- ${result.imageAlt} \n` +
            `${
              tips && result.imageAlt.includes("Not")
                ? "\n You haven't added alt attributes to all img-Tags. Make sure to add `alt='[YOUR TEXT]'` inside your img-Tags to get a better score.  \n \n"
                : ""
            }` +
            `- ${result.meta} \n` +
            `${
              tips && result.meta.includes("not")
                ? "\n You've forgot to add some meta-Tags to your site (eg. `<meta name='description' content='Free Web tutorials'>`), make sure to add them to rank higher. Find additional ones [here](https://www.w3schools.com/tags/tag_meta.asp).  \n \n"
                : ""
            }` +
            `- ${result.pageSpeed} \n` +
            `${
              tips && result.pageSpeed.includes("slow")
                ? "\n Your page seems a little slow, make sure to compress images and use CDNs for faster loading.  \n \n"
                : ""
            }` +
            `- ${result.robots} \n` +
            `${
              tips && result.robots.includes("not")
                ? "\n No robots.txt file on this site, make sure to add one to advice the Google Crawler as seen [here](https://developers.google.com/search/docs/crawling-indexing/robots/intro).  \n \n"
                : ""
            }` +
            `- ${result.indexed} \n` +
            `${
              tips && result.indexed.includes("not")
                ? "\n Your site has a noindex policy. If that's not intented, make sure to change the meta-Robots tag to not include 'noindex' anymore.  \n \n"
                : ""
            }`
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
                  title="Analyze Another Site"
                  onAction={() => {
                    setResult(null as unknown as Record<string, string>);
                    setScore(0);
                    setWebsite("");
                    setSidebar(null as unknown as Record<string, string>);

                    popToRoot({
                      clearSearchBar: false,
                    });
                  }}
                  icon={Icon.Repeat}
                />
                {score !== 6 && !tips && (
                  <Action
                    title="Open Tips"
                    onAction={() => {
                      setTips(true);
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    icon={Icon.LightBulb}
                  />
                )}
                {score !== 6 && tips && (
                  <Action
                    title="Close Tips"
                    onAction={() => {
                      setTips(false);
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    icon={Icon.LightBulb}
                  />
                )}
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
