import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { v4 as uuidv4 } from "uuid";
const defaultKeyword = "hey";

export declare interface IDoutuImage {
  id: string;
  url: string;
}

export declare interface ISource {
  name: string;
  get(keyword: string | null, pageIndex: number): Promise<{ isEnd: boolean; images: IDoutuImage[] }>;
}

export class DouBiZJSJ implements ISource {
  name = "Source 1";
  get = async (keyword: string | null, pageIndex: number): Promise<{ isEnd: boolean; images: IDoutuImage[] }> => {
    const isDefault = keyword && keyword.trim() !== "" ? false : true;
    let url = `https://www.dbbqb.com/api/search/json?start=${(pageIndex - 1) * 100}&w=${keyword}`;
    if (isDefault) url = `https://www.dbbqb.com/api/search/json?size=100`;
    const response = await fetch(url, {
      headers: {
        "Web-Agent": "web",
      },
    });
    const json = (await response.json()) as { path: string }[];
    if (json.length === 0) return { isEnd: true, images: [] };
    return {
      isEnd: json.length < 100,
      images: json.map((item) => {
        return { id: uuidv4(), url: `https://image.dbbqb.com/${item.path}` };
      }),
    };
  };
}

export class DouTuSource implements ISource {
  name = "Source 2";
  get = async (keyword: string | null, pageIndex: number): Promise<{ isEnd: boolean; images: IDoutuImage[] }> => {
    keyword = keyword && keyword.trim() !== "" ? keyword : defaultKeyword;
    const response = await fetch(
      `https://doutu.lccyy.com/doutu/items?keyword=${keyword}&pageNum=${pageIndex}&pageSize=50`,
    );
    const json = (await response.json()) as {
      totalSize: number;
      totalPages: number;
      pageSize: number;
      items: { url: string }[];
    };
    if (json.items.length === 0) return { isEnd: true, images: [] };
    return {
      isEnd: json.totalPages === pageIndex,
      images: duplication(
        json.items.filter((o) => !o.url.includes("/keyWordPic/")),
        (o) => o.url,
      ).map((item) => {
        return { id: uuidv4(), url: item.url.replace("http:", "https:") };
      }),
    };
  };
}

export class DouTuLaSource implements ISource {
  name = "Source 3";
  get = async (keyword: string | null, pageIndex: number): Promise<{ isEnd: boolean; images: IDoutuImage[] }> => {
    keyword = keyword && keyword.trim() !== "" ? keyword : defaultKeyword;
    const response = await fetch(
      `https://www.pkdoutu.com/search?type=photo&more=1&keyword=${keyword}&page=${pageIndex}`,
    );
    const $ = cheerio.load(await response.text());
    const nodes = $("div.search-result.list-group-item").find("img.img-responsive").toArray();
    return {
      isEnd: nodes.length < 72,
      images: duplication(
        nodes.map((node) => {
          return { id: uuidv4(), url: node.attribs["data-backup"].replace("http:", "https:") };
        }),
        (o) => o.url,
      ),
    };
  };
}

const duplication = <T>(listData: T[], filter: (item: T) => string): T[] => {
  const temp: { [key: string]: boolean } = {};
  return listData.reduce((item: T[], next) => {
    if (!temp[filter?.(next)]) {
      item.push(next);
      temp[filter?.(next)] = true;
    }
    return item;
  }, []);
};
