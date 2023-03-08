import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://uuidtool?clipboard";
  open(url);
};
