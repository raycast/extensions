import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://phpunserializer?clipboard";
  open(url);
};
