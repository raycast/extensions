import type { AxiosError, AxiosResponse } from "axios";
import { FastGPTResponse } from "../interfaces/fastGPTResponse";
import axiosClient from "./axios";

export const query = async (query: string, webSearch = true): Promise<FastGPTResponse> => {
  let res: AxiosResponse;
  try {
    res = await axiosClient.post("/fastgpt", {
      query,
      web_search: webSearch,
      cache: true,
    });
  } catch (err: any) {
    const error = err as AxiosError<Error>;

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx

      throw new Error(`Received invalid status code ${error.response.statusText}`);
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js

      throw new Error("No response received from Kagi API");
    }

    throw new Error(err);
  }

  if (res.status !== 200) {
    throw new Error(`Received invalid status code ${res.status}`);
  }

  return res.data as FastGPTResponse;
};
