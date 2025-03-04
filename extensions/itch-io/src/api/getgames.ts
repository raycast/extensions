import { XMLParser } from "fast-xml-parser";
import fetch from "node-fetch";
import { ItchModel } from "../interface/itchModel";

const options = {
  ignoreAttributes: true,
};

const parser = new XMLParser(options);

export async function getGames(tag: string): Promise<ItchModel[]> {
  const games: ItchModel[] = [];
  const BASE_URL = "https://itch.io/games/top-rated";
  const url = `${BASE_URL}${tag.replaceAll(" ", "-")}.xml`;
  const response = await fetch(url);
  const data = await response.text();
  const json = await parser.parse(data).rss;
  for (let i = 0; i < json.channel.item.length; i++) {
    const item = json.channel.item[i];
    const platforms = Object.keys(item.platforms).filter((key) => item.platforms[key] === "yes");
    if (platforms.length > 0) {
      const game: ItchModel = {
        title: item.title,
        plainTitle: item.plainTitle,
        imageurl: item.imageurl,
        price: item.price,
        currency: item.currency,
        link: item.link,
        description: item.description,
        pubDate: item.pubDate,
        createDate: item.createDate,
        updateDate: item.updateDate,
        platforms: platforms,
      };
      games.push(game);
    }
  }
  return games;
}
