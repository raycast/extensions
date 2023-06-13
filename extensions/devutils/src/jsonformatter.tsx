import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://jsonformatter?clipboard";
  open(url);
};
