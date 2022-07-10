import axios from "axios";
import { LIST_IMAGE_URL } from "./constants";
import { PicsumImage } from "../types/types";

export const axiosGetImageArrayBuffer = async (url: string) => {
  const res = await axios({
    url: url,
    method: "GET",
    responseType: "arraybuffer",
  });
  return res.data;
};

export const axiosGetPicsumImages = async (page: number, perPage: number) => {
  const res = await axios({
    method: "GET",
    url: LIST_IMAGE_URL,
    params: {
      page: page,
      limit: perPage,
    },
  });
  return res.data as PicsumImage[];
};
