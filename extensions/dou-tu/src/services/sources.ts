import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { index } from "cheerio/lib/api/traversing";

export declare interface IDoutuImage {
  id: number;
  url: string;
}

export declare interface ISource {
  get: (keyword: string, pageIndex: number, pageSize: number) => Promise<IDoutuImage[]>;
}

export class DouTuLaSource implements ISource {
  get = async (keyword: string, pageIndex: number, pageSize: number): Promise<IDoutuImage[]> => {
    const response = await fetch(`https://www.pkdoutu.com/search?keyword=${keyword}`);
    const $ = cheerio.load(await response.text());
    const nodes = $("div.search-result.list-group-item").find("img.img-responsive").toArray();
    return nodes.map((node, i) => {
      return { id: i, url: node.attribs["data-backup"] };
    });
  };
}
