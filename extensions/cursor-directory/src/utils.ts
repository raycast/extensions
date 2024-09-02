import promptsData from "./data/prompts.json";
import { Cache } from "@raycast/api";
import { Prompt, Section } from "./types";

const prompts = promptsData as Prompt[];

export const cache = new Cache();

export const fetchPromptDetails = async (slug: string): Promise<Prompt | undefined> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const prompt = prompts.find((p) => p.slug === slug);
      resolve(prompt);
    }, 100);
  });
};

export const fetchSections = async (): Promise<Section[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getSections());
    }, 300);
  });
};

const getSections = (): Section[] => {
  const sections = Array.from(new Set(prompts.flatMap((prompt) => prompt.tags)));
  return sections
    .map((tag) => ({
      name: tag,
      slugs: prompts
        .filter((prompt) => !cache.has(prompt.slug) && prompt.tags.includes(tag))
        .map((prompt) => prompt.slug),
    }))
    .sort((a, b) => b.slugs.length - a.slugs.length);
};

export const slugify = (str: string) => {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

export const isImageUrl = (url: string): boolean => {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];

  const isDataUri = url.startsWith("data:image/");

  const isImageExtension =
    imageExtensions.includes(url.substring(url.lastIndexOf(".")).toLowerCase()) || url.endsWith(".svg");

  return isDataUri || isImageExtension;
};
