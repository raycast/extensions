import fetch from "node-fetch";
import { Category } from "./categories";

interface Tag {
  name: string;
  canonicalName: string;
}

interface NewsImage {
  url: string;
  caption: string;
}

export interface News {
  id: string;
  headline: string;
  html: string;
  date: Date;
  url: string;
  image: NewsImage | null;
  tags: Tag[];
  by: string;
}

interface Media {
  type: string;
  flattenedCaption: string;
  imageFileExtension: string;
  id: string;
}

interface Content {
  shortId: string;
  headline: string;
  storyHTML: string;
  published: string;
  localLinkUrl: string;
  media: Media[];
  tags: Tag[];
  bylines: string;
}

interface Card {
  contents: Content[];
}

function getImage({ id, imageFileExtension, flattenedCaption }: Media) {
  return {
    url: `https://storage.googleapis.com/afs-prod/media/${id}/600${imageFileExtension}`,
    caption: flattenedCaption,
  };
}

function transform(card: Card): News {
  const content = card.contents[0];
  const photo = content.media.find((media) => media.type === "Photo") as Media;

  const news: News = {
    id: content.shortId,
    headline: content.headline,
    html: content.storyHTML,
    date: new Date(content.published),
    url: content.localLinkUrl,
    tags: content.tags,
    by: content.bylines,
    image: photo ? getImage(photo) : null,
  };

  for (const key in news) {
    if (!news[key as keyof News]) {
      throw new Error("Missing property");
    }
  }

  return news;
}

export async function getNews(value: Category["value"]): Promise<News[]> {
  try {
    const response = await fetch(`https://storage.googleapis.com/afs-prod/feeds/${value}.json.gz`);
    const { cards } = (await response.json()) as { cards: Card[] };
    const news: News[] = [];

    for (const card of cards) {
      try {
        news.push(transform(card));
      } catch (err) {
        console.log(err instanceof Error ? err.message : "Malformed news");
      }
    }

    return news;
  } catch (err) {
    return [];
  }
}
