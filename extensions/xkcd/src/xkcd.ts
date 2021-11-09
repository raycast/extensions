import { showToast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";
export const BASE_URL = "https://xkcd.com";

interface XKCD {
  month: string;
  num: number;
  link: string;
  year: string;
  news: string;
  safe_title: string;
  transcript: string;
  alt: string;
  img: string;
  title: string;
  day: string;
}

export type Comic = Pick<XKCD, "num" | "title" | "img" | "alt">;

export const fetchComic = async (num?: number) => {
  try {
    const comicData = (await fetch(`${BASE_URL}/${num ? num + "/" : ""}info.0.json`).then((res) => res.json())) as XKCD;
    const filteredData: Comic = {
      num: comicData.num,
      title: comicData.title,
      img: comicData.img,
      alt: comicData.alt,
    };
    return filteredData;
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Failed to fetch comic.");
    throw new Error("Failed to fetch comic.");
  }
};

export const maxNum = async () => {
  try {
    const comicData = (await fetch(`${BASE_URL}/info.0.json`).then((res) => res.json())) as XKCD;
    return comicData.num;
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Failed to fetch comic.");
    throw new Error("Failed to fetch comic.");
  }
};
