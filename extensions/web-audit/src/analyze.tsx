import { Action, ActionPanel, Detail, Form, Icon, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";

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
  const [score, setScore] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const checkHTags = (data: string) => {
    const h1 = data.match(/<h1/g)?.length || 0;
    const h2 = data.match(/<h2/g)?.length || 0;
    const h3 = data.match(/<h3/g)?.length || 0;
    const h4 = data.match(/<h4/g)?.length || 0;
    const h5 = data.match(/<h5/g)?.length || 0;
    const h6 = data.match(/<h6/g)?.length || 0;

    if (h1 < h2 && h2 < h3 && h3 < h4 && h4 < h5 && h5 < h6) {
      setScore((score) => score + 1);
      setResult((result) => ({ ...result, hTags: "Headings are in order" }));
    } else {
      setResult((result) => ({ ...result, hTags: "Headings are not in order" }));
    }
  };

  const checkImageAlt = (data: string) => {
    const images = data.match(/<img/g)?.length || 0;
    const altImages = data.match(/alt=/g)?.length || 0;

    if (images === altImages) {
      setScore((score) => score + 1);
      setResult((result) => ({ ...result, imageAlt: "All images have alt tags" }));
    } else {
      setResult((result) => ({ ...result, imageAlt: "Not all images have alt tags" }));
    }
  };

  const checkMeta = (data: string) => {
    const meta = data.match(/<meta/g)?.length || 0;

    if (meta > 5) {
      setScore((score) => score + 1);
      setResult((result) => ({ ...result, meta: "Meta tags are correct" }));
    } else {
      setResult((result) => ({ ...result, meta: "Some meta tags are not correct" }));
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

  const websiteCheck = async (url: string) => {
    const start = Date.now();
    const response = await fetch(url);
    const data = await response.text();
    const end = Date.now();

    getFavicon(url);
    checkHTags(data);
    checkImageAlt(data);
    checkMeta(data);
    if (end - start > 1000) {
      setResult((result) => ({ ...result, pageSpeed: `The website is slow (${end - start}ms)` }));
    } else {
      setScore((score) => score + 1);
      setResult((result) => ({ ...result, pageSpeed: `The website is fast (${end - start}ms)` }));
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
      "i"
    );
    return !!pattern.test(url);
  };

  const urlReachable = async (url: string) => {
    try {
      const response = await fetch(url);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  };

  const submitForm = async (values: Record<string, string>) => {
    setLoading(true);
    if (values.url) {
      if (validateUrl(values.url) && (await urlReachable(values.url))) {
        await websiteCheck(String(values.url));
        setWebsite(values.url);
        setLoading(false);
      } else {
        setUrlError("Invalid URL");
        setLoading(false);
      }
    } else {
      setUrlError("URL is required");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (url) submitForm({ url: url });
  }, []);

  return (
    <>
      {!result && !loading && (
        <Form
          navigationTitle={loading ? "Analyzing..." : "Web Audit"}
          actions={
            <ActionPanel>
              <Action.SubmitForm
                onSubmit={(values) => {
                  if (!loading) submitForm(values);
                  else return;
                }}
                title="Analyze"
              />
            </ActionPanel>
          }
        >
          <Form.TextField
            id="url"
            title="URL (with https)"
            placeholder="https://www.raycast.com"
            error={urlError}
            onChange={() => dropUrlErrorIfNeeded()}
            defaultValue={url}
          />
        </Form>
      )}
      {result && !loading && (
        <Detail
          navigationTitle={`Analyzed ${website}`}
          markdown={
            ((favicon && `# ![${website}](${favicon}) `) || "#") +
            ` SEO Score: ${score * 25}% \n` +
            `## Results in detail: \n` +
            ` - ${result.hTags} \n` +
            ` - ${result.imageAlt} \n` +
            ` - ${result.meta} \n` +
            ` - ${result.pageSpeed} \n`
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
                  title="Analyze another site"
                  onAction={() => {
                    setResult(null as unknown as Record<string, string>);
                    setScore(0);
                    setWebsite("");
                    setSidebar(null as unknown as Record<string, string>);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "a" }}
                  icon={Icon.ArrowLeft}
                />
              </ActionPanel>
            )
          }
        />
      )}
    </>
  );
}
