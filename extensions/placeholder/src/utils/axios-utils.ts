import axios from "axios";
import { LIST_IMAGE_URL, PER_PAGE } from "./constants";
import { PicsumImage } from "../types/types";

export const axiosGetImageArrayBuffer = async (url: string) => {
  const res = await axios({
    url: url,
    method: "GET",
    responseType: "arraybuffer",
  });
  return res.data;
};

export const axiosGetPicsumImages = async (page: number) => {
  const res = await axios({
    method: "GET",
    url: LIST_IMAGE_URL,
    params: {
      page: page,
      limit: PER_PAGE,
    },
  });
  return res.data as PicsumImage[];
};
