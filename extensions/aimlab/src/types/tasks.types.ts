import { Author } from "./author.types";

type Task = {
  id: string;
  name: string;
  weapon_id: string;
  description: string;
  image_url: string;
  author: Author;
};

export type { Task };
