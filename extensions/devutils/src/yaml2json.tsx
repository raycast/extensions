import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://yaml2json?clipboard";
  open(url);
};
