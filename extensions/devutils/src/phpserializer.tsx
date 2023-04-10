import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://phpserializer?clipboard";
  open(url);
};
