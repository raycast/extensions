import { getPreferenceValues, LaunchProps, open, showToast, Toast } from "@raycast/api";
import { ApiError, articleUrl, deleteArticle, saveArticle, updateArticle } from "./lib/api";
import { displayTitle, parseTags } from "./lib/logic";
import { ensureSignedIn, failed } from "./lib/no-view";
import { findSource } from "./lib/source";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Save }>) {
  if (!(await ensureSignedIn())) return;

  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving to Texthyper" });
  try {
    const { sendPageContent } = getPreferenceValues<Preferences.Save>();
    // As a fallback command, what was typed in Raycast's root search is the URL.
    const typed = props.arguments?.url || props.fallbackText;
    const source = await findSource(typed, { withHtml: sendPageContent });
    toast.message = source.title || source.url;

    const { article, created } = await save(source);

    // POST replaces the tags of an article that was saved before, so tags
    // typed here are added in a second step instead.
    const tags = parseTags(props.arguments?.tags);
    if (tags.length > 0) await updateArticle(article.id, { tags: [...new Set([...article.tags, ...tags])] });

    toast.style = Toast.Style.Success;
    toast.title = created ? "Saved to Texthyper" : "Already in Texthyper";
    toast.message = article.title?.trim() || source.title || displayTitle(article);
    toast.primaryAction = { title: "Open in Texthyper", onAction: () => open(articleUrl(article)) };
    toast.secondaryAction = created
      ? {
          title: "Undo",
          onAction: () =>
            attempt(toast, async () => {
              await deleteArticle(article.id);
              toast.title = "Removed from Texthyper";
              toast.primaryAction = undefined;
              toast.secondaryAction = undefined;
            }),
        }
      : {
          title: "Archive",
          onAction: () =>
            attempt(toast, async () => {
              await updateArticle(article.id, { archived: true });
              toast.title = "Archived";
              toast.secondaryAction = undefined;
            }),
        };
  } catch (error) {
    await failed(toast, error, "Could not save");
  }
}

async function attempt(toast: Toast, action: () => Promise<void>) {
  try {
    await action();
  } catch (error) {
    await failed(toast, error, "That didn't work");
  }
}

// With the page's HTML when there is some; without it when the server
// finds the page too large.
async function save(source: { url: string; title?: string; html?: string }) {
  try {
    return await saveArticle({ url: source.url, title: source.title, html: source.html });
  } catch (error) {
    if (source.html && error instanceof ApiError && error.status === 413) {
      return saveArticle({ url: source.url, title: source.title });
    }
    throw error;
  }
}
