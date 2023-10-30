import * as cheerio from "cheerio";
import { Collection, Manga, MangaList } from "../types";
import { generateKey } from "./generateKey";

// This work for both Calendario /calendario/manga and Colección /manga/:nombre
export async function scrapeManga(body: string): Promise<Manga[]> {
  try {
    const $ = cheerio.load(body);
    const Shelf: Manga[] = [];
    $("div.g-coleccion div.comic").map((_idx, el) => {
      const manga: Manga = {
        id: generateKey(),
        name: $(el).attr("data-c")?.split(" ").slice(0, -1).join(" ") || "",
        volume: $(el).attr("data-no") || "",
        price: $(el).attr("data-p") || "",
        editorial: $(el).attr("data-l") || "",
        publicationDate: $(el).attr("data-f") || "",
        url: $(el).attr("data-u") || "",
        frontImageUrl: $(el).find("img.nl").attr("src") || "",
      };
      Shelf.push(manga);
    });
    return Shelf;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getMangaCalendar(url: string): Promise<MangaList> {
  const response = await scrapeManga(url);
  const dataGroupedByDate: MangaList =
    response?.reduce(
      (grouper: MangaList, manga: Manga) => ({
        ...grouper,
        [manga.publicationDate]: [...(grouper[manga.publicationDate] || []), manga],
      }),
      {}
    ) || {};
  return dataGroupedByDate;
}

export async function getMangaCollection(url: string): Promise<Manga[]> {
  const response = await scrapeManga(url);
  return response;
}

export async function scrapeCollections(body: string) {
  try {
    const $ = cheerio.load(body);
    const Shelf: Collection[] = [];

    $("div.colex").map((_idx, el) => {
      const collection: Collection = {
        id: generateKey(),
        name: $(el).find("div.n").text() || "",
        url: $(el).find("a").attr("href") || "",
        frontImageUrl: $(el).find("img").attr("src") || "",
      };
      Shelf.push(collection);
    });
    return Shelf.filter((item) => item.url.includes("manga"));
  } catch (error) {
    console.log(error);
    return [];
  }
}
