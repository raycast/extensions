import got from "got";
import { parse } from "node-html-parser";

export type Shot = {
  title: string;
  icon: string | undefined;
  image: string | undefined;
  link: string;
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

    return {
      title: title,
      icon: imageSources?.[0],
      image: imageSources?.[Math.min(2, imageSources.length - 1)],
      link: "https://dribbble.com" + link,
    };
  });
};
