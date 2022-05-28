import fetch from "node-fetch";
import { IGame, IGameInfo, IPrice } from "./model";

const discountBaseURL = "https://switch.jumpvg.com";

type CustomResult<T> = {
  result: {
    code: number;
  };
  data: T;
};

export async function fetchDiscountList(offset = 0) {
  const payload = {
    ifDiscount: true,
    title: "",
    orderByDiscountStart: -1,
    orderByDiscountEnd: 0,
    orderByCutoff: 0,
    orderByRate: 0,
    hotType: "index",
    recommend: 0,
    subCate: "featured",
    all: true,
    offset,
    limit: 10,
    scene: 1001,
  };

  const res = await fetch(`${discountBaseURL}/switch/gameDlc/list?${queryString(payload, true)}`);
  const data = (await res.json()) as CustomResult<{ games: IGame[]; hits: number }>;
  return data.data;
}

export async function fetchGameDetail(gameId: string) {
  const res = await fetch(`${discountBaseURL}/switch/gameInfo?appid=${gameId}`);
  const data = (await res.json()) as CustomResult<{ game: IGameInfo; prices: IPrice[] }>;

  return data.data;
}

function queryString(param: any, encode = true) {
  return Object.keys(param)
    .map((key) => {
      let value = typeof param[key] === "object" ? JSON.stringify(param[key]) : param[key];
      if (encode) {
        value = encodeURIComponent(value);
      }
      return `${key}=${value}`;
    })
    .join("&");
}
