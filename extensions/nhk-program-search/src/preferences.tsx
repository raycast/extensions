import { getPreferenceValues } from "@raycast/api";
import { Genre } from "./types";

type Preferences = {
  apiKey: string;
  area: string;
  programGenre: {
    genre: Genre;
  };
};

const values = getPreferenceValues<Preferences>();

export const preferences = {
  apiKey: values.apiKey,
  area: values.area,
  genrePref: values.programGenre,
};
