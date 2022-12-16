import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://hashing?clipboard";
  open(url);
};
