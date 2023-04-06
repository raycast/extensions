import got from "got";
import { parse } from "node-html-parser";

export type UpLabsPost = {
  title: string;
  icon: string | undefined;
  image: string;
  link: string;
  download_link: string;

  likes?: string;
  views?: string;
  default_price: number;
  extended_price?: number;
  commercial_price?: number;

  tools: {
    name: string;
    friendly_name: string;
  }[];

  author?: {
    title?: string;
    link?: string;
  };
};

type UpLabsSection = {
  title: string;
  items: {
    label: string;
    url: string;
  }[];
};

export const uplabsBase = "https://www.uplabs.com";

export const fetchMetadata = async () => {
  const data = await got(uplabsBase).text();
  const document = parse(data);
  const sections = document.querySelectorAll(".secondary-nav li.dropdown--on-hover");
  const result: UpLabsSection[] = [];

  sections.forEach((section) => {
    const title = section.querySelector("a")?.textContent;

    if (!title) {
      return;
    }

    const sectionJson: UpLabsSection = {
      title: title,
      items: [],
    };

    section.querySelectorAll("div>div").forEach((element) => {
      const label = element.querySelector("a")?.textContent?.trim();
      const url = uplabsBase + element.querySelector("a")?.getAttribute("href");

      if (label && url) {
        sectionJson.items.push({ label, url });
      }
    });

    result.push(sectionJson);
  });

  return result;
};

export const fetchPosts = async (url: string) => {
  const fetchPage = (page: number) => got(`${url}?format=json&page=${page}`).json<any[]>();
  const additionalPages = url === uplabsBase ? [] : [2, 3, 4, 5, 6].map(fetchPage);
  const itemsMap = await Promise.all([fetchPage(1), ...additionalPages]);
  const items = itemsMap.flat();

  return items.map((item) => {
    const result: UpLabsPost = {
      title: item.name,
      icon: item.teaser_url,
      image: item.animated_teaser_url,
      download_link: uplabsBase + item.download_path,
      default_price: item.default_price,
      extended_price: item.extended_price,
      commercial_price: item.commercial_price,
      link: item.link_url,
      likes: item.points,
      views: item.view_count,
      tools: item.serialized_tools ?? [],
      author: {
        title: item.serialized_submitter.full_name,
        link: uplabsBase + item.serialized_submitter.link_path,
      },
    };

    return result;
  });
};
