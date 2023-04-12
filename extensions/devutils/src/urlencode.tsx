import { open } from "@raycast/api";

export default async () => {
  const url = "devutils://urlencode?clipboard";
  open(url);
};
