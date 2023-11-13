import parse from "node-html-parser";
import { OpenGraph } from "./type";

export const parseOpenGraph = (htmlText: string): OpenGraph => {
  const NONE = "none";
  const html = parse(htmlText);
  const title = html.querySelector("title")?.text || NONE;
  let description = html.querySelector("meta[name='description']");
  if (!description) {
    description = html.querySelector("meta[name='Description']");
  }
  const ogTitle = html.querySelector("meta[property='og:title']");
  const ogDescription = html.querySelector("meta[property='og:description']");
  const ogImage = html.querySelector("meta[property='og:image']");
  const ogUrl = html.querySelector("meta[property='og:url']");
  const twitterTitle = html.querySelector("meta[name='twitter:title']");
  const twitterDescription = html.querySelector("meta[name='twitter:description']");
  const twitterImage = html.querySelector("meta[name='twitter:image']");
  const twitterCard = html.querySelector("meta[name='twitter:card']");
  return {
    title,
    description: description?.getAttribute("content") || NONE,
    og: {
      title: ogTitle?.getAttribute("content") || NONE,
      description: ogDescription?.getAttribute("content") || NONE,
      image: ogImage?.getAttribute("content") || NONE,
      url: ogUrl?.getAttribute("content") || NONE,
    },
    twitter: {
      title: twitterTitle?.getAttribute("content") || NONE,
      description: twitterDescription?.getAttribute("content") || NONE,
      image: twitterImage?.getAttribute("content") || NONE,
      card: twitterCard?.getAttribute("content") || NONE,
    },
  };
};
