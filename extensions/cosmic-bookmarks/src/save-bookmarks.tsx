import {
  getPreferenceValues,
  Clipboard,
  showToast,
  Toast,
  getSelectedText,
} from "@raycast/api";
import { createBucketClient } from "@cosmicjs/sdk";
import { load } from "cheerio";
import fetch from "node-fetch";

interface Preferences {
  bucketSlug: string;
  readKey: string;
  writeKey: string;
}

export default async function Command() {
  const { bucketSlug, readKey, writeKey } = getPreferenceValues<Preferences>();
  try {
    const selectedText = await getSelectedText();
    const selectedURL = new URL(selectedText);

    if (!selectedURL) {
      console.error("Clipboard does not contain a URL");
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard does not contain a URL",
        message: "Copy a URL to your clipboard and try again",
      });
      return;
    }
    const data = await fetch(selectedURL);
    if (!data) return null; // add this line to check if data is undefined
    const html = await data.text();
    const $ = load(html);

    const metaTitle = $('meta[name="title"]');
    const metaDescription = $('meta[name="description"]');
    const pageTitle = $("title");

    const title = metaTitle.attr("content") || pageTitle.text();
    const description = metaDescription.attr("content") || "";
    const extractedUrl = data.url;

    console.log(title, description, extractedUrl);

    await addBookmark(
      bucketSlug,
      readKey,
      writeKey,
      title ?? "",
      description ?? "",
      extractedUrl ?? ""
    );
    return {
      title,
      description,
      url: extractedUrl,
    };
  } catch (error) {
    console.error("Error:", error);
  }
}

async function addBookmark(
  bucketSlug: string,
  readKey: string,
  writeKey: string,
  title: string,
  snippet: string,
  url: string
) {
  const cosmic = createBucketClient({
    bucketSlug: bucketSlug,
    readKey: readKey,
    writeKey: writeKey,
  });

  let isLoading = false;
  const success = true;

  try {
    isLoading = true;
    if (isLoading) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Saving bookmark",
        message: `Saving ${title}`,
      });
    }
    const create = await cosmic.objects.insertOne({
      type: "bookmarks",
      title: title,
      metadata: {
        snippet: snippet,
        url: url,
        read: false,
      },
    });
    const data = await create.object;
    console.log(data);
    isLoading = false && success;

    if (!isLoading && success) {
      await showToast({ title: "Saved bookmark", message: `Added ${title}` });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't save bookmark",
        message: "Try again later",
      });
    }
    Clipboard.clear();
  } catch (err) {
    console.error("Error:", err);
  }
}
