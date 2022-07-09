import { createContext } from "react";
import { GiphyFetch } from "@giphy/js-fetch-api";

const API_KEY = "uKPKaf8EyUGxgyusEwVxJTIcfthrHKaG";
export const GiphyContext = createContext(new GiphyFetch(API_KEY));
