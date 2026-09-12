import { getPreferenceValues, showToast, Toast, Clipboard, open, showHUD } from "@raycast/api";
import fetch, { Headers } from "node-fetch";
import { NewArticle } from "../types/newArticle";

export const commonPreferences = () => {
  const accessToken = getPreferenceValues<Preferences>()["access-token"];
  const primaryAction = getPreferenceValues<Preferences.SearchArticle>()["primary-action"];
  return {
    accessToken,
    primaryAction,
  };
};
export const preference = commonPreferences();

export const createArticle = async (
  isEdit: boolean,
  title: string,
  published = false,
  body_markdown: string,
  tags: string[],
  id?: number
) => {
  const URL = isEdit ? `https://dev.to/api/articles/${id}` : "https://dev.to/api/articles";
  const METHOD = isEdit ? "PUT" : "POST";

  try {
    const headers = new Headers({
      accept: "application/vnd.forem.api-v1+json",
      "Content-Type": "application/json",
      "api-key": preference.accessToken,
    });

    const response = await fetch(URL, {
      method: METHOD,
      headers: headers,
      body: JSON.stringify({
        article: {
          title: title,
          published: published,
          body_markdown: body_markdown,
          tags: tags,
        },
      }),
    });

    if (response.ok) {
      const result = (await response.json()) as NewArticle;

      const options: Toast.Options = {
        style: Toast.Style.Success,
        title: isEdit ? "Update article successfully!" : "Create article successfully!",
        message: "Click to copy article link.",
        primaryAction: {
          title: "Copy article link",
          onAction: (toast) => {
            Clipboard.copy(String(result.url));
            toast.title = "Link is copied to Clipboard.";
            toast.message = "";
          },
        },
        secondaryAction: {
          title: "Open in browser",
          onAction: (toast) => {
            open(String(result.url));
            toast.hide();
            showHUD("Open in Browser");
          },
        },
      };
      await showToast(options);
    }
  } catch (e) {
    await showToast(Toast.Style.Failure, String(e));
  }
};
