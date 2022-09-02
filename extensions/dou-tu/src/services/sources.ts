import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { v4 as uuidv4 } from "uuid";

export declare interface IDoutuImage {
  id: string;
  url: string;
}

export declare interface ISource {
  get: (keyword: string, pageIndex: number) => Promise<IDoutuImage[]>;
}

export class DouTuLaSource implements ISource {
  get = async (keyword: string, pageIndex: number): Promise<IDoutuImage[]> => {
    const response = await fetch(
      `https://www.pkdoutu.com/search?type=photo&more=1&keyword=${keyword}&page=${pageIndex}`
    );
    const $ = cheerio.load(await response.text());
    const nodes = $("div.search-result.list-group-item").find("img.img-responsive").toArray();
    return nodes.map((node) => {
      return { id: uuidv4(), url: node.attribs["data-backup"] };
    });
  };
}
