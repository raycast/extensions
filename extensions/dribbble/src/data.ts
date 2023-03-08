import got from "got";
import { parse } from "node-html-parser";

export type Shot = {
  title: string;
  icon: string | undefined;
  image: string;
  link: string;

  likes?: string;
  views?: string;

  author?: {
    title?: string;
    link?: string;
  };
};

export const fetchShots = async (filter: string) => {
  const data = await got(`https://dribbble.com/shots/${filter}`).text();

  const document = parse(data);
  const items = document.querySelectorAll("li.shot-thumbnail");
  return items.map((item) => {
    const title = item.querySelector(".shot-title")?.textContent || "Unknown title";
    const link = item.querySelector(".shot-thumbnail-link")?.getAttribute("href");

    const img = item.querySelector('img[data-sizes="auto"]');
    const srcSet = img?.getAttribute("data-srcset");
    const imageSources = srcSet
      ?.split(", ")
      .map((s) => s.split(" ")?.[0])
      .filter((s) => s);

    const authorElement = item.querySelector('a[rel="contact"]');
    const image = imageSources?.[Math.min(2, imageSources.length - 1)];

    const result: Shot = {
      title: title,
      icon: imageSources?.[0],
      image: image || "",
      link: "https://dribbble.com" + link,
      likes: item.querySelector(".js-shot-likes-count")?.textContent.trim(),
      views: item.querySelector(".js-shot-views-count")?.textContent.trim(),
      author: {
        title: authorElement?.querySelector("span")?.textContent,
        link: "https://dribbble.com" + authorElement?.getAttribute("href"),
      },
    };

    return result;
  });
};
