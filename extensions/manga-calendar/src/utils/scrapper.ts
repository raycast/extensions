import { Collection, GraphicPublication, GraphicPublicationList } from "@types";
import { generateKey } from "@utils/generateKey";
import * as cheerio from "cheerio";

// This work for both Calendario /calendario/publication and Colección /publication/:nombre
export async function scrapeManga(body: string): Promise<GraphicPublication[]> {
  try {
    const $ = cheerio.load(body);
    const Shelf: GraphicPublication[] = [];
    $("div.g-coleccion div.comic").map((_idx, el) => {
      const Publication: GraphicPublication = {
        id: generateKey(),
        name: $(el).attr("data-c")?.split(" ").slice(0, -1).join(" ") || "",
        volume: $(el).attr("data-no") || "",
        price: $(el).attr("data-p") || "",
        editorial: $(el).attr("data-l") || "",
        publicationDate: $(el).attr("data-f") || "",
        url: $(el).attr("data-u") || "",
        frontImageUrl: $(el).find("img.nl").attr("src") || "",
      };
      Shelf.push(Publication);
    });
    return Shelf;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getMangaCalendar(url: string): Promise<GraphicPublicationList> {
  const response = await scrapeManga(url);
  const dataGroupedByDate: GraphicPublicationList =
    response?.reduce(
      (grouper: GraphicPublicationList, publication: GraphicPublication) => ({
        ...grouper,
        [publication.publicationDate]: [...(grouper[publication.publicationDate] || []), publication],
      }),
      {}
    ) || {};
  return dataGroupedByDate;
}

export async function getMangaCollection(url: string): Promise<GraphicPublication[]> {
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
    return Shelf;
  } catch (error) {
    console.log(error);
    return [];
  }
}
