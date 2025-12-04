import { getPreferenceValues } from "@raycast/api";
import axios from "axios";
import { z } from "zod";
import { User } from "./types";
import { Preferences } from "../../types";

const userSchema = z.object({
  id: z.number().int(),
});

const preferences = getPreferenceValues<Preferences>();
axios.defaults.baseURL = `https:/${preferences.url_prefix}.mocoapp.com/api/v1`;

export const fetchUser = async (): Promise<User> => {
  const { data } = await axios.get("/session", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Token token=${preferences.apikey}`,
    },
  });

  const user = userSchema.parse(data);

  return user;
};
