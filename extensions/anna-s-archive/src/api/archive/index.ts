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
        const title = $(el).text();
        const $img = $(el).parent().parent().parent().find("img").first();
        const cover = $img?.attr("src") || null;

        const author = $(el).next().text() || "unknown";
        const publisher = $(el).next().next().text() || "unknown";
        const $info = $(el)
          .parent()
          .parent()
          .find("div[class='text-gray-800 dark:text-slate-400 font-semibold text-sm leading-[1.2] mt-2']");
        const infoRaw = $info.text().split("TODO")[0].split(", ");
        const info = infoRaw.flatMap((s) => s.trim().split("·")).map((s) => s.replace("📕 ", "").trim());

        const ext = info.find((item) => !isEmpty(item) && fileTypes.includes(item.toLowerCase())) || "unknown";
        const type =
          info.find(
            (item) => !isEmpty(item) && docTypes.find((type) => item.toLowerCase().includes(type.toLowerCase())),
          ) || "unknown";

        const size =
          info
            .find((item) => item.endsWith("MB"))
            ?.replace("MB", "")
            .trim() || "<unknown>";
        const languageRaw = info.find((item) => !isEmpty(item) && languageStrings.includes(item)) || "unknown";

        const language = languageRaw.split("[").pop()?.replace("]", "") || "unknown";

        const fileName = $(el).prev().text() || null;

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
