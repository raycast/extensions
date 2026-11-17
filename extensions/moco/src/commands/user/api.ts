import { api } from "../../utils/api";
import { z } from "zod";
import { User } from "./types";

const userSchema = z.object({
  id: z.number().int(),
});

export const fetchUser = async (): Promise<User> => {
  const { data } = await api.get("/session");

  const user = userSchema.parse(data);

  return user;
};
