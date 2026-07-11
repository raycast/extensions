import { Article } from "./models/article";
import { ArticleDto } from "./models/dto/articleDto";
import { Duration } from "./models/duration";

export function createDuration(article: ArticleDto): Duration {
  try {
    const modified = article.changes?.modified;
    const published = article.changes?.published;
    const updated = article.meta?.changes?.updated;
    const lastSaved = article.meta?.changes?.last_saved;

    return calculateDuration(modified, published, updated, lastSaved);
  } catch (error) {
    console.error("Error extracting duration:", error);
    return {
      durationLastModified: "",
      lastModifiedInSec: 0,
    };
  }
}

export function checkForDescription(article: ArticleDto): string {
  try {
    const textResource = article.resources?.find(
      (resource) => resource.type === "Text",
    );

    if (!textResource?.paragraphs) return "";

    return textResource.paragraphs
      .map((paragraph) => paragraph.text?.value || "")
      .filter((text) => text.length > 0)
      .join("\n\n");
  } catch (error) {
    console.error("Error extracting description:", error);
    return "";
  }
}

export function checkForCategory(article: ArticleDto): string {
  try {
    return article.category?.title || article.vignette?.title || "";
  } catch (error) {
    console.error("Error extracting category:", error);
    return "";
  }
}

export function getImageLink(article: ArticleDto): string {
  const imageBase = "https://gfx.omni.se/images/";
  try {
    const imageResource = article.resources?.find(
      (resource) => resource.type === "Image",
    );
    const imageId = imageResource?.image_asset?.id;
    return imageId ? `${imageBase}${imageId}` : "";
  } catch (error) {
    console.error("Error extracting image link:", error);
    return "";
  }
}

export function sortArticleByTime(articles: Article[]): Article[] {
  return articles.sort(
    (n1, n2) => n2.duration.lastModifiedInSec - n1.duration.lastModifiedInSec,
  );
}

function calculateDuration(
  modified: string,
  published: string,
  updated: string,
  lastSaved: string,
): Duration {
  const now = new Date().getTime();
  const modifiedTime = new Date(modified).getTime();
  const publishedTime = new Date(published).getTime();
  const updatedTime = new Date(updated).getTime();
  const lastSavedTime = new Date(lastSaved).getTime();
  const modOrPubTime =
    modifiedTime > publishedTime ? modifiedTime : publishedTime;

  const updateOrModPubTime =
    updatedTime > modOrPubTime ? updatedTime : modOrPubTime;

  const mostRecentTime =
    lastSavedTime > updateOrModPubTime ? lastSavedTime : updateOrModPubTime;

  const diffInSec = Math.floor((now - mostRecentTime) / 1000);
  const hours = Math.floor(diffInSec / 3600);
  const min = Math.floor((diffInSec % 3600) / 60);
  const sec = Math.floor(diffInSec % 60);

  if (hours > 0) {
    const duration: Duration = {
      durationLastModified: `${hours}h ${min}m`,
      lastModifiedInSec: mostRecentTime,
    };
    return duration;
  }
  const duration: Duration = {
    durationLastModified: `${min}m ${sec}s`,
    lastModifiedInSec: mostRecentTime,
  };
  return duration;
}
