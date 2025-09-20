import { load } from "cheerio";

import { docTypes, fileTypes, languageStrings } from "@/constants";
import { isEmpty } from "@/utils";

export type ArchiveItem = {
  id: string;
  title: string;
  author: string;
  publisher: string;
  ext: string;
  type: string;
  size: string;
  language: string;
  cover: string | null;
  fileName: string | null;
};

export type WithOrder<T> = T & {
  order: number;
};

export const parseArchivePage = (text: string): ArchiveItem[] => {
  // replace all "<!--" "-->" with empty string, because they are commented out in the response
  const cleanedText = text.replaceAll(/<!--/g, "").replaceAll(/-->/g, "");

  const $ = load(cleanedText);

  const md5Links = $("a[href^='/md5/'].js-vim-focus");
  const md5Map = new Map<string, WithOrder<ArchiveItem>>();

  md5Links.each((index, el) => {
    const href = $(el).attr("href");
    if (href) {
      const id = href.split("/").pop();
      if (id && !md5Map.has(id)) {
        const title = $(el).find("h3").text();
        const $img = $(el).find("img").first();
        const cover = $img?.attr("src") || null;

        const author =
          $(el)
            .find(
              "div[class='max-lg:line-clamp-[2] lg:truncate leading-[1.2] lg:leading-[1.35] max-lg:text-sm italic']",
            )
            .text() || "unknown";
        const publisher =
          $(el).find("div[class='truncate leading-[1.2] lg:leading-[1.35] max-lg:text-xs']").text() || "unknown";
        const infoRaw = (
          $(el).find("div[class='line-clamp-[2] leading-[1.2] text-[10px] lg:text-xs text-gray-500']").text() || ""
        ).split(", ");
        const info = infoRaw.map((s) => s.trim());

        const ext = info.find((item) => !isEmpty(item) && fileTypes.includes(item)) || "unknown";
        const type = info.find((item) => !isEmpty(item) && docTypes.includes(item)) || "unknown";
        const size =
          info
            .find((item) => item.endsWith("MB"))
            ?.replace("MB", "")
            .trim() || "<unknown>";
        const languageRaw = info.find((item) => !isEmpty(item) && languageStrings.includes(item)) || "unknown";

        const restInfo = info.filter((s) => s !== ext && s !== type && s !== `${size}MB` && s !== languageRaw);
        const language = languageRaw.split("[").pop()?.replace("]", "") || "unknown";

        const fileName = restInfo.length > 0 ? restInfo.join(", ") : null;

        md5Map.set(id, {
          id,
          title,
          order: index,
          cover,
          author,
          publisher,
          ext,
          type,
          size,
          language,
          fileName,
        });
      }
    }
  });

  const md5List = Array.from(md5Map.values()).sort((a, b) => a.order - b.order);

  return md5List;
};
