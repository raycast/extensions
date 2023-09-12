import { Action, ActionPanel, Form, Clipboard, showHUD, showToast, Toast, popToRoot } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import fetch from "node-fetch";
import { APIs } from "./data/apiData";
import { isValidUrl } from "./helpers/url";

export default function Command() {
  const [url, setUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [slug, setSlug] = useState(undefined);
  const [oldSlug, setOldSlug] = useState("");
  const [urlError, setUrlError] = useState(undefined);
  const [slugError, setSlugError] = useState(undefined);
  const [reqType, setReqType] = useState("new");
  const slugRef = useRef(null);

  useEffect(() => {
    Clipboard.readText().then((clipboardTxt: any) =>
      isValidUrl(clipboardTxt) ? setUrl(clipboardTxt) : setUrl("" as any)
    );
  }, []);

  useEffect(() => {
    isValidUrl(url) ? setUrlError(undefined) : setUrlError("Please enter a valid URL" as any);
  }, [url]);

  useEffect(() => {
    (slugRef as any).current?.focus();
    slug !== "" ? setSlugError(undefined) : setSlugError("Slug can't be empty" as any);
  }, [slug, slugRef]);

  function getShortUrl() {
    if (urlError === undefined && slugError === undefined) {
      showToast({
        style: Toast.Style.Animated,
        title: reqType === "new" ? "Generating a short URL" : "Updating the URL",
      });
      fetch(`${APIs.tynyfy.url}${reqType === "new" ? APIs.tynyfy.newUrl : APIs.tynyfy.updateUrl}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqType === "new" ? { url } : { url, new_slug: slug, old_slug: oldSlug }),
      })
        .then((res) => res.json())
        .then((json: any) => {
          if (!json.success) {
            throw new Error(json.data as any);
          }
          const sUrl = (json as any).data.redirect_url;
          const oldSlug = sUrl.split("/").at(-1);
          Clipboard.copy(sUrl);
          setShortUrl(sUrl);
          setOldSlug(oldSlug);
          setSlug(oldSlug);
          if (reqType === "new") {
            showToast({
              style: Toast.Style.Success,
              title: "🎉 Shortened URL copied to clipboard",
            });
          }
        })
        .then(() => {
          if (reqType === "update") {
            setTimeout(() => {
              popToRoot({ clearSearchBar: true });
            }, 300);
            showHUD("🎉 Shortened URL copied to clipboard");
          }
        })
        .catch((error) => {
          showToast({
            style: Toast.Style.Failure,
            title: error.message,
          });
        });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Please resolve the shown error(s) and try again",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title={reqType == "new" ? "Shorten the URL" : "Copy the Customized URL"}
            shortcut={{ modifiers: [], key: "return" }}
            onAction={() => {
              getShortUrl();
            }}
          />
          {reqType === "update" ? <Action.Paste content={shortUrl} /> : null}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Enter the URL"
        placeholder="Enter the URL to shorten"
        value={url}
        error={urlError}
        onChange={setUrl}
        onFocus={() => setReqType("new")}
      />
      {slug !== undefined && (
        <>
          <Form.TextField
            ref={slugRef}
            id="edited_url"
            title="Customize the URL"
            placeholder="slug"
            value={slug}
            error={slugError}
            onChange={setSlug as any}
            onFocus={() => setReqType("update")}
          />
          <Form.Description text={`https://tynyfy.com/t/${slug}`} />
        </>
      )}
    </Form>
  );
}
