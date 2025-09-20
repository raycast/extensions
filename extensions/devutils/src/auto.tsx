import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://auto?clipboard";
  open(url);
};
