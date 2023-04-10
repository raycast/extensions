import { Article } from "./Article";
import { Duration } from "./Duration";

export function createDuration(articleResponse: any): Duration {
  try {
    const modified = Object(articleResponse.changes)["modified"];
    const published = Object(articleResponse.changes)["published"];
    const updated = Object(articleResponse.meta.changes)["updated"];
    const lastSaved = Object(articleResponse.meta.changes)["last_saved"];
    return calculateDuration(modified, published, updated, lastSaved);
  } catch (error) {
    if (error instanceof TypeError) {
      console.error("No time stamp found:", error.message);
    } else {
      throw error;
    }
  }
  const duration: Duration = {
    durationLastModified: "",
    lastModifiedInSec: 0,
  };
  return duration;
}

export function checkForDescription(articleResponse: any): string {
  try {
    let text = "";
    const res: [any] = articleResponse.main_text.paragraphs;
    res.forEach((e) => {
      text += Object(e.text)["value"] + "\n\n";
    });
    return text;
  } catch (error) {
    if (error instanceof TypeError) {
      console.error("No category found:", error.message);
    } else {
      return "";
    }
  }
  return "";
}

export function checkForCategory(articleResponse: any): string {
  try {
    return Object(articleResponse.category["title"]);
  } catch (error) {
    if (error instanceof TypeError) {
      console.error("No category found:", error.message);
    } else {
      return Object(articleResponse.vignette["title"]);
    }
  }
  return "";
}

export function getImageLink(articleResponse: any): string {
  const imageBase = "https://gfx.omni.se/images/";
  try {
    const imageId = Object(articleResponse.main_resource.image_asset)["id"];
    return imageBase + imageId;
  } catch (error) {
    if (error instanceof TypeError) {
      console.error("No image found:", error.message);
    } else {
      throw error;
    }
  }
  return "";
}

export function sortArticleByTime(articles: Article[]): Article[] {
  return articles.sort(
    (n1, n2) => n2.duration.lastModifiedInSec - n1.duration.lastModifiedInSec
  );
}

function calculateDuration(
  modified: string,
  published: string,
  updated: string,
  lastSaved: string
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
